"use client";

import Navbar from "@/components/navbar";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAPIUrl } from "@/lib/api";

const API_URL = getAPIUrl();

const statusBadgeClasses: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-600",
};

interface Booking {
  id: string;
  flightId: string;
  status: string;
  totalAmount: number;
  hasCancellationProtection: boolean;
  createdAt: string;
  flight: {
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime?: string;
  };
  seats: { id: string; seatNumber: string; seatClass: string; price: number }[];
  passengerName: string | null;
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; bookingId: string | null; refundAmount: number; fee: number }>({ isOpen: false, bookingId: null, refundAmount: 0, fee: 0 });
  const [seatModal, setSeatModal] = useState<{ isOpen: boolean; bookingId: string | null; fee: number }>({ isOpen: false, bookingId: null, fee: 0 });
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [processingCancel, setProcessingCancel] = useState(false);

  const { user, session, loading: authLoading } = useAuth();

  const fetchBookings = async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/bookings`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to fetch bookings", error);
      showToast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && session) {
      fetchBookings();
    }
  }, [user, session, authLoading]);

  const showToast = (message: string, type: "success" | "info" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Rules for changing seats and cancelling
  const calculateFees = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    const msUntilFlight = new Date(booking.flight.departureTime).getTime() - Date.now();
    const hoursUntilFlight = msUntilFlight / (1000 * 60 * 60);

    // Cancel Rules (Real-world style)
    let refundAmount = 0;
    let cancelFee = 0;
    
    if (booking.hasCancellationProtection) {
      refundAmount = booking.totalAmount; // Full refund with protection
      cancelFee = 0;
    } else {
      if (hoursUntilFlight <= 24) {
        // Less than 24h: 100% loss (no refund)
        cancelFee = booking.totalAmount; 
        refundAmount = 0;
      } else if (hoursUntilFlight <= 24 * 7) {
        // 2-7 days: $100 base fee + 30% of ticket
        cancelFee = Math.min(100 + booking.totalAmount * 0.3, booking.totalAmount);
        refundAmount = booking.totalAmount - cancelFee;
      } else {
        // More than 7 days: $50 base fee
        cancelFee = Math.min(50, booking.totalAmount); 
        refundAmount = booking.totalAmount - cancelFee;
      }
    }

    // Seat Change Rules
    let seatChangeFee = 0;
    const baseSeatFee = 5;

    if (hoursUntilFlight > 168) { // > 7 Days
      seatChangeFee = baseSeatFee; // Base processing fee only
    } else if (hoursUntilFlight >= 48) { // 2 to 7 Days
      seatChangeFee = baseSeatFee + (booking.totalAmount * 0.15);
    } else { // < 48 Hours
      seatChangeFee = baseSeatFee + (booking.totalAmount * 0.40);
    }

    return { refundAmount, cancelFee, seatChangeFee, hoursUntilFlight, flightId: booking.flightId };
  };

  const openCancelModal = (id: string) => {
    const fees = calculateFees(id);
    if (!fees) return;
    setCancelModal({ isOpen: true, bookingId: id, refundAmount: fees.refundAmount, fee: fees.cancelFee });
  };

  const openSeatModal = (id: string) => {
    const fees = calculateFees(id);
    if (!fees) return;
    setSeatModal({ isOpen: true, bookingId: id, fee: fees.seatChangeFee });
  };

  const confirmCancel = async () => {
    if (!cancelModal.bookingId) return;
    
    try {
      setProcessingCancel(true);
      const res = await fetch(`${API_URL}/bookings/${cancelModal.bookingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to cancel booking");
      
      // Refresh local state 
      setBookings(prev => 
        prev.map(b => b.id === cancelModal.bookingId ? { ...b, status: "CANCELLED" } : b)
      );
      
      showToast(`Booking cancelled. Refund of $${cancelModal.refundAmount.toFixed(2)} is being processed.`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to process cancellation.", "error");
    } finally {
      setProcessingCancel(false);
      setCancelModal({ isOpen: false, bookingId: null, refundAmount: 0, fee: 0 });
    }
  };

  const confirmSeatChange = () => {
    if (!seatModal.bookingId) return;
    const booking = bookings.find((b) => b.id === seatModal.bookingId);
    
    showToast("Redirecting to seat selection...", "info");
    setSeatModal({ isOpen: false, bookingId: null, fee: 0 });
    
    if (booking) {
      router.push(`/flights/live?live=${encodeURIComponent(booking.flight.flightNumber)}&dep=${booking.flight.origin}&arr=${booking.flight.destination}&depTime=${encodeURIComponent(booking.flight.departureTime)}&arrTime=${encodeURIComponent(booking.flight.arrivalTime || '')}&bookingId=${booking.id}&step=2`);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10 relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground mb-8">Manage your upcoming and past flights.</p>
        </motion.div>

        {/* Global Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }} className={`fixed top-24 left-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-green-600 text-white" : toast.type === "error" ? "bg-red-600 text-white" : "bg-primary text-white"}`}>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"} {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {authLoading || loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading your reservations...</p>
          </div>
        ) : !user ? null : bookings.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">✈️</span>
            <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
            <p className="text-muted-foreground mb-6">You haven&apos;t made any reservations.</p>
            <Link href="/flights" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">Search Flights</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, i) => (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`rounded-2xl bg-white border p-6 shadow-sm transition-all hover:shadow-md ${booking.status === "CANCELLED" ? "border-red-200 opacity-70 bg-red-50/10" : "border-border"}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-block rounded-full bg-secondary px-3 py-0.5 text-xs font-medium">{booking.flight.flightNumber}</span>
                      <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusBadgeClasses[booking.status] || "bg-gray-100 text-gray-700"}`}>{booking.status}</span>
                      {booking.hasCancellationProtection && <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-3 py-0.5 text-xs font-medium">🛡️ Protected</span>}
                    </div>
                    <h2 className="text-lg font-bold">{booking.flight.origin} → {booking.flight.destination}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(booking.flight.departureTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {new Date(booking.flight.departureTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {booking.passengerName && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span>👤</span> Passenger: {booking.passengerName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">Seats ({booking.seats.length})</p>
                      <p className="font-medium">{booking.seats.map(s => s.seatNumber).join(", ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="text-xl font-bold text-primary">${booking.totalAmount}</p>
                    </div>
                  </div>
                </div>

                {booking.status === "CONFIRMED" && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-3">
                    <button onClick={() => showToast("Boarding pass downloaded!", "success")} className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all">📱 Mobile Boarding Pass</button>
                    <button onClick={() => openSeatModal(booking.id)} className="rounded-full border border-border px-5 py-2 text-xs font-medium hover:bg-secondary transition-colors">♻️ Change Seats</button>
                    <button onClick={() => openCancelModal(booking.id)} className="rounded-full border border-red-200 px-5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">✕ Cancel Booking</button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Modals via absolute positioning / portal trick */}
        <AnimatePresence>
          {cancelModal.isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                <h3 className="text-xl font-bold text-red-600 mb-2">Cancel Booking?</h3>
                <p className="text-muted-foreground text-sm mb-6">This action will release your seats back into the database immediately.</p>
                
                <div className="bg-gray-50 border rounded-xl p-4 mb-6 text-sm">
                  {cancelModal.fee === 0 ? (
                    <p className="text-green-700 font-medium whitespace-pre-wrap">You have Cancellation Protection!{'\n'}Your refund will be the full amount.</p>
                  ) : (
                    <div className="space-y-2">
                       <p className="text-red-600 font-medium">Cancellation Fee: ${cancelModal.fee.toFixed(2)}</p>
                       <p>Reimbursement decreases as the flight approaches.</p>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t text-lg">
                    Estimated Refund: <span className="font-bold text-primary">${cancelModal.refundAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setCancelModal({ isOpen: false, bookingId: null, refundAmount: 0, fee: 0 })} disabled={processingCancel} className="px-5 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors disabled:opacity-50">Keep Booking</button>
                  <button onClick={confirmCancel} disabled={processingCancel} className="px-5 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                    {processingCancel ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {seatModal.isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-blue-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                <h3 className="text-xl font-bold text-blue-900 mb-2">Change Seats</h3>
                
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-6 text-sm">
                  <p className="flex justify-between font-bold text-lg border-b border-blue-100 pb-2 mb-2">
                     <span>Seat Change Fee:</span>
                     {seatModal.fee === 5 ? (
                       <span className="text-green-600">${seatModal.fee.toFixed(2)}</span>
                     ) : (
                       <span className="text-red-500">${seatModal.fee.toFixed(2)}</span>
                     )}
                   </p>
                  
                  {seatModal.fee <= 5 ? (
                    <p className="text-green-700 font-medium">Standard $5 processing fee applies since your flight is more than 7 days away!</p>
                  ) : (
                    <div className="space-y-1">
                       <p className="text-amber-600 font-medium">A timeline-based fee applies because your flight is soon.</p>
                       <span className="text-xs text-muted-foreground block">Includes base fee + dynamic extra charge.</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setSeatModal({ isOpen: false, bookingId: null, fee: 0 })} className="px-5 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={confirmSeatChange} className="px-5 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-opacity-90 transition-colors">Proceed to Seat Map</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </>
  );
}
