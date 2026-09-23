import { NextResponse } from "next/server";
import { getPaymongoCheckoutSession } from "@/lib/paymongo";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/email";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const sessionData = await getPaymongoCheckoutSession(sessionId);
    const attributes = sessionData?.attributes || {};
    const payments = attributes.payments || [];
    const isPaid =
      attributes.status === "paid" ||
      payments.some((p) => p.attributes?.status === "paid" || p.status === "paid");

    const metadata = attributes.metadata || {};
    const reservationId = metadata.reservation_id;
    const reservationNumber = metadata.reservation_number || attributes.reference_number;

    const supabase = await createServiceClient();

    // Query reservation
    let query = supabase
      .from("reservations")
      .select("*, customer:customers(*), court:courts(*), payment:payments(*)");

    if (reservationId) {
      query = query.eq("id", reservationId);
    } else if (reservationNumber) {
      query = query.eq("reservation_number", reservationNumber);
    } else {
      return NextResponse.json({ error: "No reservation associated with session" }, { status: 404 });
    }

    const { data: reservation, error: resError } = await query.single();

    if (resError || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // If paid, confirm if pending and ensure confirmation email is sent
    if (isPaid) {
      if (reservation.status === "pending") {
        const paymentObj = payments[0] || null;
        const paymentId = paymentObj?.id || sessionId;
        const paymentChannel =
          paymentObj?.attributes?.source?.type || paymentObj?.source?.type || "paymongo";

        // Update payment
        await supabase
          .from("payments")
          .update({
            status: "paid",
            transaction_id: paymentId,
            payment_method: paymentChannel,
            paid_at: new Date().toISOString(),
          })
          .eq("reservation_id", reservation.id);

        // Update reservation
        await supabase
          .from("reservations")
          .update({ status: "confirmed" })
          .eq("id", reservation.id);

        reservation.status = "confirmed";
      }

      // Send confirmation email if not already sent
      const { data: sentNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("reservation_id", reservation.id)
        .eq("type", "booking_confirmed")
        .eq("status", "sent")
        .maybeSingle();

      if (!sentNotif && reservation.customer?.email && reservation.court) {
        await sendBookingConfirmedEmail(
          reservation.id,
          reservation.customer.email,
          reservation.customer.full_name,
          reservation.reservation_number,
          reservation.court.name,
          reservation.reservation_date,
          reservation.start_time,
          reservation.end_time,
          Number(reservation.total_amount)
        );
      }
    }

    return NextResponse.json({
      success: true,
      verified: isPaid,
      reservation,
    });
  } catch (error) {
    console.error("PayMongo Session Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
