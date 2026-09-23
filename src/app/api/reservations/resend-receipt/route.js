import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/email";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const reservationNumber = searchParams.get("reservation_number");
  const reservationId = searchParams.get("reservation_id");
  const overrideEmail = searchParams.get("email");

  if (!reservationNumber && !reservationId) {
    return NextResponse.json(
      { error: "Provide either reservation_number or reservation_id query parameter" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServiceClient();

    let query = supabase
      .from("reservations")
      .select("*, customer:customers(*), court:courts(*)");

    if (reservationId) {
      query = query.eq("id", reservationId);
    } else {
      query = query.eq("reservation_number", reservationNumber);
    }

    const { data: reservation, error } = await query.single();

    if (error || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const recipientEmail = overrideEmail || reservation.customer?.email;

    if (!recipientEmail) {
      return NextResponse.json({ error: "No recipient email found for this reservation" }, { status: 400 });
    }

    await sendBookingConfirmedEmail(
      reservation.id,
      recipientEmail,
      reservation.customer?.full_name || "Valued Customer",
      reservation.reservation_number,
      reservation.court?.name || "Court",
      reservation.reservation_date,
      reservation.start_time,
      reservation.end_time,
      Number(reservation.total_amount)
    );

    return NextResponse.json({
      success: true,
      message: `Receipt sent to ${recipientEmail} for ${reservation.reservation_number}`,
      reservation_number: reservation.reservation_number,
      sent_to: recipientEmail,
    });
  } catch (err) {
    console.error("Failed to resend receipt:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
