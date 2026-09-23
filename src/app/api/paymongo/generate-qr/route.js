import { NextResponse } from "next/server";
import { createPaymongoQrPayment } from "@/lib/paymongo";
import { createCustomer, getCourt } from "@/actions/reservations";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      court_id,
      reservation_date,
      start_time,
      end_time,
      full_name,
      email,
      phone,
      existing_reservation_id,
    } = body;

    if (!court_id || !reservation_date || !start_time || !end_time || !full_name || !email || !phone) {
      return NextResponse.json({ error: "Missing required booking details." }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Get court
    const court = await getCourt(court_id);
    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // 2. Calculate duration and total amount
    const [startH, startM] = start_time.split(":").map(Number);
    const [endH, endM] = end_time.split(":").map(Number);
    const duration = (endH * 60 + endM) - (startH * 60 + startM);
    const totalAmount = (duration / 60) * Number(court.price_per_hour);

    // 3. Create or find customer
    const customer = await createCustomer(full_name, email, phone);

    let reservation = null;

    // Check if we can reuse an existing pending reservation for the same slot
    if (existing_reservation_id) {
      const { data: existing } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", existing_reservation_id)
        .eq("status", "pending")
        .single();
      if (existing) {
        reservation = existing;
      }
    }

    if (!reservation) {
      // Create new reservation
      const { data: newRes, error: resError } = await supabase
        .from("reservations")
        .insert({
          customer_id: customer.id,
          court_id,
          reservation_date,
          start_time,
          end_time,
          duration,
          total_amount: totalAmount,
          status: "pending",
        })
        .select()
        .single();

      if (resError) {
        if (resError.message.includes("overlap") || resError.message.includes("blocked")) {
          return NextResponse.json(
            { error: "This time slot is no longer available. Please select another time." },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: resError.message }, { status: 500 });
      }

      reservation = newRes;

      // Create payment record
      await supabase.from("payments").insert({
        reservation_id: reservation.id,
        amount: totalAmount,
        payment_method: "qrph",
        status: "pending",
      });
    }

    // 4. Generate Dynamic QR Ph via PayMongo
    const qrResult = await createPaymongoQrPayment({
      reservation,
      court,
      customer,
    });

    // 5. Update payment record with paymentIntentId
    await supabase
      .from("payments")
      .update({
        transaction_id: qrResult.paymentIntentId,
        payment_method: "qrph",
      })
      .eq("reservation_id", reservation.id);

    return NextResponse.json({
      success: true,
      qrCodeUrl: qrResult.qrCodeUrl,
      paymentIntentId: qrResult.paymentIntentId,
      reservationId: reservation.id,
      reservationNumber: reservation.reservation_number,
      totalAmount,
    });
  } catch (error) {
    console.error("Error generating QR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
