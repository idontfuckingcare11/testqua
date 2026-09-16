import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();

    // In production, verify webhook signature here
    // const signature = request.headers.get("x-webhook-signature");
    // verifyPaymentSignature(body, signature);

    const { reservation_id, status, transaction_id } = body;

    if (!reservation_id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Update payment status
    if (status === "paid") {
      await supabase
        .from("payments")
        .update({
          status: "paid",
          transaction_id: transaction_id || `WEBHOOK-${Date.now()}`,
          paid_at: new Date().toISOString(),
        })
        .eq("reservation_id", reservation_id)
        .eq("status", "pending");

      await supabase
        .from("reservations")
        .update({ status: "confirmed" })
        .eq("id", reservation_id)
        .eq("status", "pending");
    } else if (status === "failed") {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("reservation_id", reservation_id)
        .eq("status", "pending");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
