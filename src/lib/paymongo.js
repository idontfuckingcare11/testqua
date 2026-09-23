import crypto from "crypto";

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

function getAuthHeader() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured in environment variables.");
  }
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

/**
 * Creates a PayMongo hosted checkout session
 */
export async function createPaymongoCheckoutSession({
  reservation,
  court,
  customer,
  origin,
}) {
  const totalInCentavos = Math.round(Number(reservation.total_amount) * 100);
  const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const payload = {
    data: {
      attributes: {
        billing: {
          name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
        },
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        description: `Pickleball Court Reservation - ${court.name}`,
        line_items: [
          {
            currency: "PHP",
            amount: totalInCentavos,
            name: `${court.name} Reservation`,
            description: `${reservation.reservation_date} (${reservation.start_time.slice(0, 5)} - ${reservation.end_time.slice(0, 5)})`,
            quantity: 1,
          },
        ],
        payment_method_types: ["gcash", "paymaya", "card", "grab_pay", "dob", "qrph"],
        reference_number: reservation.reservation_number,
        success_url: `${baseUrl}/book/confirmation?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservation.id}`,
        cancel_url: `${baseUrl}/book/payment?cancelled=1`,
        metadata: {
          reservation_id: reservation.id,
          reservation_number: reservation.reservation_number,
        },
      },
    },
  };

  const response = await fetch(`${PAYMONGO_API_BASE}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg =
      data?.errors?.[0]?.detail ||
      data?.errors?.[0]?.description ||
      "Failed to create PayMongo checkout session";
    throw new Error(errorMsg);
  }

  return {
    sessionId: data.data.id,
    checkoutUrl: data.data.attributes.checkout_url,
  };
}

/**
 * Fetches checkout session details from PayMongo
 */
export async function getPaymongoCheckoutSession(sessionId) {
  if (!sessionId) throw new Error("Session ID is required");

  const response = await fetch(`${PAYMONGO_API_BASE}/checkout_sessions/${sessionId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.errors?.[0]?.detail || "Failed to retrieve PayMongo checkout session";
    throw new Error(errorMsg);
  }

  return data.data;
}

/**
 * Verifies PayMongo webhook signature
 */
export function verifyWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  if (!webhookSecret || !signatureHeader) return true; // bypass if secret not set (e.g. dev)

  try {
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const testSigPart = parts.find((p) => p.startsWith("te="));
    const liveSigPart = parts.find((p) => p.startsWith("li="));

    const timestamp = timestampPart ? timestampPart.split("=")[1] : "";
    const signature = liveSigPart ? liveSigPart.split("=")[1] : testSigPart ? testSigPart.split("=")[1] : "";

    if (!timestamp || !signature) return false;

    const signaturePayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signaturePayload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    console.error("Webhook signature verification error:", err);
    return false;
  }
}

/**
 * Creates a Dynamic QR Ph Payment Intent and returns the QR Code image
 */
export async function createPaymongoQrPayment({
  reservation,
  court,
  customer,
}) {
  const totalInCentavos = Math.round(Number(reservation.total_amount) * 100);

  // 1. Create Payment Intent
  const intentPayload = {
    data: {
      attributes: {
        amount: totalInCentavos,
        payment_method_allowed: ["qrph"],
        currency: "PHP",
        description: `Pickleball Court Reservation - ${court.name} (${reservation.reservation_number})`,
        statement_descriptor: "Pickleball Court",
        metadata: {
          reservation_id: reservation.id,
          reservation_number: reservation.reservation_number,
        },
      },
    },
  };

  const intentRes = await fetch(`${PAYMONGO_API_BASE}/payment_intents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(intentPayload),
  });

  const intentData = await intentRes.json();
  if (!intentRes.ok) {
    const errorMsg =
      intentData?.errors?.[0]?.detail ||
      intentData?.errors?.[0]?.description ||
      "Failed to create PayMongo Payment Intent";
    throw new Error(errorMsg);
  }

  const paymentIntentId = intentData.data.id;

  // 2. Create Payment Method (type: qrph)
  const methodPayload = {
    data: {
      attributes: {
        type: "qrph",
        billing: {
          name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
        },
      },
    },
  };

  const methodRes = await fetch(`${PAYMONGO_API_BASE}/payment_methods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(methodPayload),
  });

  const methodData = await methodRes.json();
  if (!methodRes.ok) {
    const errorMsg =
      methodData?.errors?.[0]?.detail ||
      methodData?.errors?.[0]?.description ||
      "Failed to create PayMongo Payment Method";
    throw new Error(errorMsg);
  }

  const paymentMethodId = methodData.data.id;

  // 3. Attach Payment Method to Payment Intent
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const attachPayload = {
    data: {
      attributes: {
        payment_method: paymentMethodId,
        return_url: `${baseUrl}/book/confirmation?reservation_id=${reservation.id}`,
      },
    },
  };

  const attachRes = await fetch(`${PAYMONGO_API_BASE}/payment_intents/${paymentIntentId}/attach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(attachPayload),
  });

  const attachData = await attachRes.json();
  if (!attachRes.ok) {
    const errorMsg =
      attachData?.errors?.[0]?.detail ||
      attachData?.errors?.[0]?.description ||
      "Failed to attach PayMongo Payment Method";
    throw new Error(errorMsg);
  }

  // 4. Extract QR Code image URL / data
  const nextAction = attachData.data.attributes?.next_action;
  const qrCodeUrl =
    nextAction?.code?.image_url ||
    nextAction?.code?.url ||
    nextAction?.consume_qr_code?.image_url ||
    nextAction?.image_url;

  if (!qrCodeUrl) {
    console.error("PayMongo attach response next_action:", JSON.stringify(nextAction));
    throw new Error("PayMongo did not return a QR code image URL.");
  }

  return {
    paymentIntentId,
    clientKey: attachData.data.attributes?.client_key,
    qrCodeUrl,
  };
}

/**
 * Fetches Payment Intent details to check status
 */
export async function getPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) throw new Error("Payment Intent ID is required");

  const response = await fetch(`${PAYMONGO_API_BASE}/payment_intents/${paymentIntentId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.errors?.[0]?.detail || "Failed to retrieve PayMongo payment intent";
    throw new Error(errorMsg);
  }

  return data.data;
}

