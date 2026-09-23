"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useBooking } from "@/hooks/use-booking";
import { BookingSteps } from "@/components/booking/booking-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Printer, Home, CalendarDays, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate, formatTimeRange } from "@/lib/utils";

function BookConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const reservationIdParam = searchParams.get("reservation_id");
  const { data, updateBooking, resetBooking } = useBooking();

  const [verifying, setVerifying] = useState(Boolean(sessionId || reservationIdParam));
  const [verifiedData, setVerifiedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (sessionId) {
      // Verify checkout session (redirect flow)
      fetch(`/api/paymongo/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.reservation) {
            const r = res.reservation;
            setVerifiedData({
              reservationNumber: r.reservation_number,
              fullName: r.customer?.full_name,
              email: r.customer?.email,
              phone: r.customer?.phone,
              courtName: r.court?.name,
              date: r.reservation_date,
              startTime: r.start_time?.slice(0, 5),
              endTime: r.end_time?.slice(0, 5),
              totalAmount: Number(r.total_amount),
              status: r.status,
              paymentStatus: r.payment?.[0]?.status || (res.verified ? "paid" : "pending"),
              paymentMethod: r.payment?.[0]?.payment_method || "paymongo",
            });
            updateBooking({
              reservationNumber: r.reservation_number,
              reservationId: r.id,
              courtName: r.court?.name,
              fullName: r.customer?.full_name,
              email: r.customer?.email,
              phone: r.customer?.phone,
              date: r.reservation_date,
              startTime: r.start_time?.slice(0, 5),
              endTime: r.end_time?.slice(0, 5),
            });
          } else {
            setErrorMsg(res.error || "Could not verify payment session.");
          }
        })
        .catch((err) => {
          console.error("Verification error:", err);
          setErrorMsg("Failed to verify transaction. Please contact support.");
        })
        .finally(() => {
          setVerifying(false);
        });
    } else if (reservationIdParam) {
      // Verify QR Ph payment intent flow (redirect from polling)
      fetch(`/api/paymongo/verify-payment-intent?reservation_id=${encodeURIComponent(reservationIdParam)}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.reservation) {
            const r = res.reservation;
            setVerifiedData({
              reservationNumber: r.reservation_number,
              fullName: r.customer?.full_name,
              email: r.customer?.email,
              phone: r.customer?.phone,
              courtName: r.court?.name,
              date: r.reservation_date,
              startTime: r.start_time?.slice(0, 5),
              endTime: r.end_time?.slice(0, 5),
              totalAmount: Number(r.total_amount),
              status: r.status,
              paymentStatus: r.payment?.[0]?.status || "paid",
              paymentMethod: r.payment?.[0]?.payment_method || "qrph",
            });
            updateBooking({
              reservationNumber: r.reservation_number,
              reservationId: r.id,
              courtName: r.court?.name,
              fullName: r.customer?.full_name,
              email: r.customer?.email,
              phone: r.customer?.phone,
              date: r.reservation_date,
              startTime: r.start_time?.slice(0, 5),
              endTime: r.end_time?.slice(0, 5),
            });
          } else if (!data.reservationNumber) {
            router.push("/book");
          }
        })
        .catch((err) => {
          console.error("Reservation fetch error:", err);
        })
        .finally(() => {
          setVerifying(false);
        });
    } else if (!data.reservationNumber) {
      router.push("/book");
    }
  }, [sessionId, reservationIdParam, data.reservationNumber, router, updateBooking]);

  const handlePrint = () => {
    window.print();
  };

  const handleNewBooking = () => {
    resetBooking();
    router.push("/book");
  };

  if (verifying) {
    return (
      <div className="text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">Verifying Payment...</h2>
        <p className="text-sm text-gray-500">Please hold on while we confirm your transaction.</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-10 w-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Issue</h2>
        <p className="text-sm text-gray-600 mb-6">{errorMsg}</p>
        <Button onClick={() => router.push("/book")} className="bg-green-600 hover:bg-green-700 text-white">
          Return to Booking
        </Button>
      </div>
    );
  }

  const active = verifiedData || {
    reservationNumber: data.reservationNumber,
    fullName: data.fullName,
    courtName: data.courtName,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    email: data.email,
    phone: data.phone,
    totalAmount: (data.courtPrice || 0) * (data.duration ? data.duration / 60 : 1),
    status: "pending",
    // Treat both "paymongo" and "qrph" as paid online payment methods
    paymentStatus: ["paymongo", "qrph", "gcash", "maya", "card"].includes(data.paymentMethod)
      ? "paid"
      : "pending",
    paymentMethod: data.paymentMethod || "cash",
  };

  if (!active.reservationNumber) return null;

  const isPaid = active.paymentStatus === "paid" || active.status === "confirmed";

  return (
    <div className="print:py-0">
      <div className="print:hidden">
        <BookingSteps currentStep={7} />
      </div>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {isPaid ? "Reservation Confirmed!" : "Reservation Received"}
        </h1>
        <p className="text-gray-500">
          {isPaid
            ? "Your payment was processed and your court is booked."
            : "Your court booking has been submitted."}
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <Card className="print:shadow-none print:border-0 shadow-sm border-gray-200">
          <CardContent className="p-6 space-y-4">
            <div className="text-center bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs text-gray-500 mb-1">Reservation Number</p>
              <p className="text-2xl font-bold text-green-700 tracking-wider">
                {active.reservationNumber}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Customer</p>
                <p className="font-semibold text-gray-900">{active.fullName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Court</p>
                <p className="font-semibold text-gray-900">{active.courtName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Date</p>
                <p className="font-semibold text-gray-900">
                  {active.date ? formatDate(active.date) : ""}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Time</p>
                <p className="font-semibold text-gray-900">
                  {active.startTime && active.endTime
                    ? formatTimeRange(active.startTime, active.endTime)
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Email</p>
                <p className="font-semibold text-gray-900 break-all">{active.email}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Phone</p>
                <p className="font-semibold text-gray-900">{active.phone}</p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Total Amount</span>
              <span className="text-xl font-bold text-green-700">
                {formatCurrency(active.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Payment Status</span>
              {isPaid ? (
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">
                  Paid &amp; Confirmed
                </span>
              ) : (
                <span className="text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                  Pending Payment
                </span>
              )}
            </div>

            {isPaid ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 leading-relaxed">
                Thank you! Your payment was received. A confirmation receipt and booking details have been sent to your email.
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                Please complete your payment via QR Ph to confirm your court booking.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 print:hidden">
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Print Reservation
          </Button>
          <Button
            onClick={handleNewBooking}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Book Another Court
          </Button>
        </div>

        <div className="mt-4 text-center print:hidden">
          <Link href="/" className="text-sm text-gray-500 hover:text-green-600">
            <Home className="inline h-4 w-4 mr-1" />
            Back to Home
          </Link>
          <span className="text-gray-300 mx-2">·</span>
          <span className="text-sm text-gray-500">
            Use the search bar in the header to track your reservation
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BookConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading confirmation...</p>
        </div>
      }
    >
      <BookConfirmationContent />
    </Suspense>
  );
}

