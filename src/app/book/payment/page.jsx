"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBooking } from "@/hooks/use-booking";
import { BookingSteps } from "@/components/booking/booking-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Zap,
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const paymentOptions = [
  {
    id: "paymongo",
    name: "Scan QR Ph (GCash, Maya, Banks)",
    description: "Instant dynamic QR code. Scan with any PH e-wallet or bank app.",
    badge: "Instant Confirmation",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <QrCode className="h-6 w-6 text-emerald-600" />,
  },
];

function BookPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, updateBooking } = useBooking();

  const [selectedMethod, setSelectedMethod] = useState(data.paymentMethod || "paymongo");

  // Dynamic QR Code State
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [currentReservationId, setCurrentReservationId] = useState(data.reservationId || null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrError, setQrError] = useState(null);

  // Timer & Polling
  const [secondsLeft, setSecondsLeft] = useState(1800); // 30 mins
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  const pollingRef = useRef(null);
  const hasGeneratedRef = useRef(false);

  useEffect(() => {
    if (!data.date || !data.courtId || !data.startTime || !data.fullName) {
      router.push("/book");
    }
  }, [data, router]);

  useEffect(() => {
    if (searchParams.get("cancelled")) {
      toast.error("Payment was cancelled or interrupted. You can try again or choose another payment method.");
    }
  }, [searchParams]);

  // Automatically generate PayMongo QR Ph on load or when selecting PayMongo
  useEffect(() => {
    if (selectedMethod !== "paymongo") return;
    if (hasGeneratedRef.current || qrCodeUrl || loadingQr) return;
    if (!data.courtId || !data.date || !data.startTime || !data.endTime || !data.fullName) return;

    hasGeneratedRef.current = true;
    generateQrCode();
  }, [selectedMethod, data, qrCodeUrl, loadingQr]);

  const generateQrCode = async () => {
    setLoadingQr(true);
    setQrError(null);

    try {
      const res = await fetch("/api/paymongo/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: data.courtId,
          reservation_date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          existing_reservation_id: currentReservationId,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate PayMongo QR code");
      }

      setQrCodeUrl(json.qrCodeUrl);
      setPaymentIntentId(json.paymentIntentId);
      setCurrentReservationId(json.reservationId);
      setSecondsLeft(1800);

      updateBooking({
        reservationId: json.reservationId,
        reservationNumber: json.reservationNumber,
        paymentMethod: "qrph",
      });
    } catch (err) {
      console.error("QR Generation error:", err);
      setQrError(err.message || "Could not generate QR code. Please try again.");
      hasGeneratedRef.current = false;
    } finally {
      setLoadingQr(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!qrCodeUrl || isPaidSuccess) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [qrCodeUrl, isPaidSuccess]);

  // Polling for Payment completion
  useEffect(() => {
    if (!paymentIntentId || !currentReservationId || isPaidSuccess) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `/api/paymongo/verify-payment-intent?payment_intent_id=${paymentIntentId}&reservation_id=${currentReservationId}`
        );
        const json = await res.json();

        if (json.status === "succeeded") {
          setIsPaidSuccess(true);
          clearInterval(pollingRef.current);
          toast.success("Payment confirmed! Your reservation is complete.");

          setTimeout(() => {
            router.push(`/book/confirmation?reservation_id=${currentReservationId}`);
          }, 1500);
        }
      } catch (err) {
        console.error("Polling check error:", err);
      }
    };

    pollingRef.current = setInterval(checkStatus, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [paymentIntentId, currentReservationId, isPaidSuccess, router]);

  const hours = data.duration / 60;
  const total = (data.courtPrice || 0) * hours;

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-full px-2 sm:px-0">
      <BookingSteps currentStep={6} />
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Payment
        </h1>
        <p className="text-sm sm:text-base text-gray-500">Scan QR Ph or select your payment method</p>
      </div>

      <div className="max-w-md mx-auto w-full">
        <div className="bg-green-50 rounded-xl p-4 text-center mb-6 border border-green-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-700">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatTimeRange(data.startTime || "", data.endTime || "")} · {data.duration} min
          </p>
        </div>

        {/* Payment Methods Selection */}
        <div className="space-y-3 mb-6">
          {paymentOptions.map((option) => (
            <Card
              key={option.id}
              className={cn(
                "cursor-pointer transition-all border-2",
                selectedMethod === option.id
                  ? "border-green-600 shadow-md bg-green-50/20"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
              )}
              onClick={() => setSelectedMethod(option.id)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="mt-1 shrink-0">{option.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-gray-900">{option.name}</span>
                      <span className={cn("text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0", option.badgeColor)}>
                        {option.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* DYNAMIC QR PH DISPLAY - EMBEDDED DIRECTLY ON PAGE */}
        {selectedMethod === "paymongo" && (
          <div className="bg-white border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-6 mb-6 shadow-md text-center">
            {isPaidSuccess ? (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-pulse">
                  <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Confirmed!</h3>
                <p className="text-xs text-gray-500">Redirecting you to confirmation details...</p>
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto" />
              </div>
            ) : loadingQr ? (
              <div className="py-12 space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold text-gray-800">Generating QR Ph code...</p>
                <p className="text-xs text-gray-400">Connecting securely</p>
              </div>
            ) : qrError ? (
              <div className="py-8 space-y-3">
                <p className="text-sm text-red-600 font-medium">{qrError}</p>
                <Button
                  onClick={generateQrCode}
                  variant="outline"
                  size="sm"
                  className="text-xs border-red-200 hover:bg-red-50"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try Again
                </Button>
              </div>
            ) : qrCodeUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 gap-2">
                  <div className="text-left min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">Scan with GCash / Maya / Bank</p>
                    <p className="text-[11px] text-gray-400">Exact Amount: {formatCurrency(total)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTimer(secondsLeft)}</span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="relative mx-auto bg-white p-2 sm:p-3 rounded-2xl border border-gray-200 shadow-sm inline-block max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="Dynamic QR Ph"
                    className="w-48 h-48 sm:w-64 sm:h-64 object-contain rounded-lg mx-auto max-w-full"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    QR Ph
                  </div>
                </div>

                {/* Live pulsing status */}
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] sm:text-xs">Waiting for scan... Auto-confirms upon payment</span>
                </div>

                {/* Supported Wallets List */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-medium text-gray-500 pt-1 flex-wrap">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">GCash</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded">Maya</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded">BPI / BDO</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded">GoTyme</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 mt-6">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push("/book/summary")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="text-xs text-gray-500 text-center sm:text-right">
            {isPaidSuccess ? (
              <span className="text-emerald-700 font-bold flex items-center justify-center sm:justify-end gap-1">
                <CheckCircle2 className="h-4 w-4" /> Confirmed!
              </span>
            ) : (
              <span>Scan the QR code above with your e-wallet to complete.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading payment options...</p>
        </div>
      }
    >
      <BookPaymentContent />
    </Suspense>
  );
}
