import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/email";

async function finalizeConfirmedPayment(supabase, reservationId, paymentId, paymentChannel) {
  const { data: reservation } = await supabase
    .from("reservations")
    .select("*, customer:customers(*), court:courts(*)")
    .eq("id", reservationId)
    .single();

  if (reservation && reservation.status === "pending") {
    // Update payment record
    await supabase
      .from("payments")
      .update({
        status: "paid",
        transaction_id: paymentId,
        payment_method: paymentChannel || "qrph",
        paid_at: new Date().toISOString(),
      })
      .eq("reservation_id", reservationId);

    // Update reservation status
    await supabase
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", reservationId);

    // Send confirmation email
    const customer = reservation.customer;
    const court = reservation.court;
    if (customer?.email && court) {
      await sendBookingConfirmedEmail(
        reservationId,
        customer.email,
        customer.full_name,
        reservation.reservation_number,
        court.name,
        reservation.reservation_date,
        reservation.start_time,
        reservation.end_time,
        Number(reservation.total_amount)
      );
    }
  }
}

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paymongo-signature");
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    // Verify signature if secret is provided
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.data?.attributes?.type;
    const supabase = await createServiceClient();

    if (eventType === "checkout_session.payment.paid") {
      const sessionData = event.data.attributes.data;
      const sessionId = sessionData.id;
      const metadata = sessionData.attributes?.metadata || {};
      const reservationId = metadata.reservation_id;

      const payments = sessionData.attributes?.payments || [];
      const paymentObj = payments[0] || null;
      const paymentId = paymentObj?.id || sessionId;
      const paymentChannel = paymentObj?.attributes?.source?.type || "paymongo";

      let targetReservationId = reservationId;
      if (!targetReservationId) {
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("reservation_id")
          .eq("transaction_id", sessionId)
          .single();
        targetReservationId = paymentRecord?.reservation_id;
      }

      if (targetReservationId) {
        await finalizeConfirmedPayment(supabase, targetReservationId, paymentId, paymentChannel);
      }
    } else if (eventType === "payment.paid") {
      const paymentData = event.data.attributes.data;
      const paymentId = paymentData.id;
      const paymentIntentId = paymentData.attributes?.payment_intent_id;
      const paymentChannel = paymentData.attributes?.source?.type || "qrph";

      if (paymentIntentId) {
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("reservation_id")
          .eq("transaction_id", paymentIntentId)
          .single();

        if (paymentRecord?.reservation_id) {
          await finalizeConfirmedPayment(supabase, paymentRecord.reservation_id, paymentId, paymentChannel);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayMongo Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
