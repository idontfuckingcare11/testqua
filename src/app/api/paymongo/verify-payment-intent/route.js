import { NextResponse } from "next/server";
import { getPaymentIntent } from "@/lib/paymongo";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/email";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get("payment_intent_id");
    const reservationId = searchParams.get("reservation_id");

    if (!paymentIntentId) {
      return NextResponse.json({ error: "payment_intent_id is required" }, { status: 400 });
    }

    const intentData = await getPaymentIntent(paymentIntentId);
    const attributes = intentData?.attributes || {};
    const status = attributes.status;

    if (status === "succeeded") {
      const supabase = await createServiceClient();

      // Find reservation by ID or by payments.transaction_id
      let query = supabase
        .from("reservations")
        .select("*, customer:customers(*), court:courts(*), payment:payments(*)");

      if (reservationId) {
        query = query.eq("id", reservationId);
      } else {
        const metadata = attributes.metadata || {};
        if (metadata.reservation_id) {
          query = query.eq("id", metadata.reservation_id);
        } else {
          const { data: payRec } = await supabase
            .from("payments")
            .select("reservation_id")
            .eq("transaction_id", paymentIntentId)
            .single();
          if (payRec?.reservation_id) {
            query = query.eq("id", payRec.reservation_id);
          }
        }
      }

      const { data: reservation, error: resErr } = await query.single();

      if (reservation) {
        if (reservation.status === "pending") {
          const latestPayment = attributes.payments?.[0];
          const paymentId = latestPayment?.id || paymentIntentId;

          // Update payment
          await supabase
            .from("payments")
            .update({
              status: "paid",
              transaction_id: paymentId,
              payment_method: "qrph",
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
        status: "succeeded",
        reservation,
      });
    }

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error("Payment intent verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
