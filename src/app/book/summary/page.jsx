"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/hooks/use-booking";
import { BookingSteps } from "@/components/booking/booking-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, ArrowLeft, Calendar, Clock, Landmark, User, Mail, Phone, ShieldCheck } from "lucide-react";
import { formatCurrency, formatTimeRange, formatDate } from "@/lib/utils";

export default function BookSummaryPage() {
  const router = useRouter();
  const { data } = useBooking();

  const [agreed, setAgreed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    if (!data.date || !data.courtId || !data.startTime || !data.fullName) {
      router.push("/book");
    }
  }, [data, router]);

  const slotCount = data.selectedSlots.length;
  const hours = data.duration / 60;
  const courtFee = (data.courtPrice || 0) * hours;
  const additionalFees = 0;
  const total = courtFee + additionalFees;

  return (
    <div>
      <BookingSteps currentStep={5} />
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Reservation Summary
        </h1>
        <p className="text-gray-500">Review your booking details and accept terms before payment</p>
      </div>

      <div className="max-w-md mx-auto">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Court</p>
                <p className="font-semibold text-gray-900">{data.courtName}</p>
                <p className="text-xs text-gray-400 capitalize">{data.courtType}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-semibold text-gray-900">
                  {data.date ? formatDate(data.date) : ""}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="font-semibold text-gray-900">
                  {data.startTime && data.endTime
                    ? formatTimeRange(data.startTime, data.endTime)
                    : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {slotCount} slot{slotCount !== 1 ? "s" : ""} · {hours} hour{hours !== 1 ? "s" : ""}
                </p>
                {data.selectedSlots.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.selectedSlots.sort().map((slot) => {
                      const [h, m] = slot.split(":").map(Number);
                      const endH = h + 1;
                      const endStr = `${endH.toString().padStart(2, "0")}:${(m || 0).toString().padStart(2, "0")}`;
                      return (
                        <span key={slot} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {formatTimeRange(slot, endStr)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Court Fee ({formatCurrency(data.courtPrice || 0)} × {hours}h)</span>
                <span className="text-gray-900">{formatCurrency(courtFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Additional Fees</span>
                <span className="text-gray-900">{formatCurrency(additionalFees)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-700">{formatCurrency(total)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 text-xs">Customer:</span>
                <span className="font-medium text-gray-900">{data.fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 text-xs">Email:</span>
                <span className="font-medium text-gray-900 break-all">{data.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 text-xs">Phone:</span>
                <span className="font-medium text-gray-900">{data.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* POLICY & TERMS AND CONDITIONS */}
        <div className="mt-6 space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                I agree that court bookings and payments are <strong>final and non-refundable</strong> once confirmed.
              </span>
            </label>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                I have read and agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTermsOpen(true);
                  }}
                  className="font-medium text-green-600 underline underline-offset-2 hover:text-green-700"
                >
                  Terms &amp; Conditions
                </button>
                .
              </span>
            </label>
          </div>
        </div>

        {/* Terms Dialog */}
        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="max-w-lg sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Terms &amp; Conditions</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-gray-600 text-left max-h-[55vh] overflow-y-auto">
              <p>
                1. Reservations paid via QR Ph are automatically confirmed upon scanning and successful authorization.
              </p>
              <p>
                3. All bookings are final and non-refundable. No cancellations or rescheduling are allowed, and no-shows are not refunded.
              </p>
              <p>
                4. Your contact details are strictly used to coordinate your booking and send confirmation notifications.
              </p>
              <p>
                5. If the facility suspends bookings due to maintenance or force majeure, the facility will coordinate with you for alternative arrangements.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-6 flex justify-between items-center gap-3">
          <Button variant="outline" onClick={() => router.push("/book/details")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => router.push("/book/payment")}
            disabled={!agreed || !termsAccepted}
            className="bg-green-600 hover:bg-green-700 text-white px-8 font-bold disabled:opacity-50"
          >
            Proceed to Payment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
