"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useBooking } from "@/hooks/use-booking";
import { BookingSteps } from "@/components/booking/booking-steps";
import { createReservation } from "@/actions/reservations";
import { getSettings } from "@/actions/reservations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, CreditCard, Smartphone, Banknote, Clock } from "lucide-react";
import { formatCurrency, formatTimeRange } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const paymentMethods = [
  { id: "gcash", name: "GCash", icon: <Smartphone className="h-6 w-6" />, color: "text-blue-600" },
  { id: "gotyme", name: "GoTyme", icon: <CreditCard className="h-6 w-6" />, color: "text-purple-600" },
  { id: "cash", name: "Cash", icon: <Banknote className="h-6 w-6" />, color: "text-green-600" },
];

export default function BookPaymentPage() {
  const router = useRouter();
  const { data, updateBooking } = useBooking();
  const [selectedMethod, setSelectedMethod] = useState(data.paymentMethod || "");
  const [processing, setProcessing] = useState(false);
  const [gcashQr, setGcashQr] = useState(null);
  const [gotymeQr, setGotymeQr] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    if (!data.date || !data.courtId || !data.startTime || !data.fullName) {
      router.push("/book");
    }
    getSettings().then((settings) => {
      const facility = settings.facility ?? undefined;
      if (facility?.gcash_qr) setGcashQr(facility.gcash_qr);
      if (facility?.gotyme_qr) setGotymeQr(facility.gotyme_qr);
    });
  }, [data, router]);

  const hours = data.duration / 60;
  const total = (data.courtPrice || 0) * hours;

  const handlePayment = async () => {
    if (!selectedMethod || !data.courtId || !data.date || !data.startTime || !data.endTime) return;

    setProcessing(true);
    try {
      const { reservation, payment } = await createReservation({
        court_id: data.courtId,
        reservation_date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        payment_method: selectedMethod,
      });

      updateBooking({
        reservationId: reservation.id,
        reservationNumber: reservation.reservation_number,
        paymentMethod: selectedMethod,
      });
      router.push("/book/confirmation");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const activeQr = selectedMethod === "gcash" ? gcashQr : selectedMethod === "gotyme" ? gotymeQr : null;
  const methodName = selectedMethod === "gcash" ? "GCash" : "GoTyme";

  return (
    <div>
      <BookingSteps currentStep={6} />
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Payment
        </h1>
        <p className="text-gray-500">Select your payment method</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-green-50 rounded-xl p-4 text-center mb-6">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatTimeRange(data.startTime || "", data.endTime || "")} · {data.duration} min
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={cn(
                "cursor-pointer transition-all",
                selectedMethod === method.id
                  ? "border-2 border-green-600 shadow-md"
                  : "hover:shadow-md border-2 border-transparent"
              )}
              onClick={() => setSelectedMethod(method.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={method.color}>{method.icon}</div>
                <span className="font-semibold text-gray-900">{method.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedMethod === "gcash" && activeQr && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-center">
            <p className="text-sm font-medium text-blue-800 mb-3">Scan to pay with GCash</p>
            <div className="relative w-48 h-48 mx-auto bg-white rounded-lg p-2">
              <Image src={activeQr} alt="GCash QR Code" fill className="object-contain" />
            </div>
            <p className="text-xs text-blue-600 mt-3">
              Amount: <span className="font-bold">{formatCurrency(total)}</span>
            </p>
          </div>
        )}

        {selectedMethod === "gotyme" && activeQr && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6 text-center">
            <p className="text-sm font-medium text-purple-800 mb-3">Scan to pay with GoTyme</p>
            <div className="relative w-48 h-48 mx-auto bg-white rounded-lg p-2">
              <Image src={activeQr} alt="GoTyme QR Code" fill className="object-contain" />
            </div>
            <p className="text-xs text-purple-600 mt-3">
              Amount: <span className="font-bold">{formatCurrency(total)}</span>
            </p>
          </div>
        )}

        {selectedMethod === "gcash" && !activeQr && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
            <p className="font-medium">GCash Payment</p>
            <p className="mt-1">
              Please pay {formatCurrency(total)} to our GCash account.
              Admin will verify your payment.
            </p>
          </div>
        )}

        {selectedMethod === "gotyme" && !activeQr && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-sm text-purple-800">
            <p className="font-medium">GoTyme Payment</p>
            <p className="mt-1">
              Please pay {formatCurrency(total)} to our GoTyme account.
              Admin will verify your payment.
            </p>
          </div>
        )}

        {selectedMethod === "cash" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-800">
            <p className="font-medium">Cash Payment</p>
            <p className="mt-1">
              Please pay at the front desk when you arrive. Your reservation will be
              confirmed upon payment.
            </p>
          </div>
        )}

        {(selectedMethod === "gcash" || selectedMethod === "gotyme") && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Admin Confirmation Required</p>
                <p className="mt-1">
                  After payment, your reservation will be pending until our admin verifies
                  the payment. You will receive a confirmation email once approved.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">
              I agree that all payments are <strong>final and non-refundable</strong>. I understand that my reservation is subject to admin confirmation and I will receive an email once approved.
            </span>
          </label>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTermsOpen(true);
                }}
                className="font-medium text-green-600 underline underline-offset-2"
              >
                Terms &amp; Conditions
              </button>
              .
            </span>
          </label>
        </div>

        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="max-w-lg sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Terms &amp; Conditions</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-gray-600 text-left max-h-[55vh] overflow-y-auto">
              <p>
                1. Reservations are subject to admin confirmation of payment. You will
                receive a confirmation email once your booking is approved.
              </p>
              <p>
                2. All bookings are final and non-refundable. No cancellations or
                rescheduling are allowed, and no-shows are not refunded.
              </p>
              <p>
                3. All payments made are final and non-refundable once confirmed, except
                as provided in these terms.
              </p>
              <p>
                4. Your name, contact details, and booking history are used solely to
                manage your reservations and send booking notifications.
              </p>
              <p>
                5. Requests to cancel or reschedule due to weather conditions, including
                rain on outdoor courts, are not accepted. If the facility itself suspends
                bookings due to maintenance, you may be offered a refund or rebooking at
                the facility's discretion.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/book/summary")} disabled={processing}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handlePayment}
            disabled={!selectedMethod || processing || !agreed || !termsAccepted}
            className="bg-green-600 hover:bg-green-700 text-white px-8 font-bold"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(total)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
