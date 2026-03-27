"use client";

import Navbar from "@/components/navbar";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAPIUrl } from "@/lib/api";

const API_URL = getAPIUrl();

const seatClassColors: Record<string, string> = {
  FIRST_CLASS: "bg-amber-100 border-amber-400 text-amber-800",
  BUSINESS: "bg-blue-100 border-blue-400 text-blue-800",
  ECONOMY: "bg-gray-100 border-gray-300 text-gray-700",
};

const seatClassSelectedColors: Record<string, string> = {
  FIRST_CLASS: "bg-amber-500 border-amber-600 text-white",
  BUSINESS: "bg-blue-500 border-blue-600 text-white",
  ECONOMY: "bg-primary border-primary text-white",
};

const ADDON_PRICES = {
  baggage: 50,
  insurance: 35,
  meals: {
    Standard: 0,
    Vegetarian: 15,
    Vegan: 20,
    Halal: 25,
    Kosher: 30,
  } as Record<string, number>,
};

interface Seat {
  id: string; // tmp-id from server
  seatNumber: string;
  seatClass: string;
  isAvailable: boolean;
  price: number;
}

interface JITFlightInfo {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
}

export default function FlightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, session } = useAuth();

  // Primary state: The live URL parameters dictate the flight
  const flightInfo: JITFlightInfo = {
    flightNumber: searchParams.get("live") || "Unknown",
    airline: searchParams.get("airline") || "Unknown Airline",
    origin: searchParams.get("dep") || "ORG",
    destination: searchParams.get("arr") || "DST",
    departureTime: searchParams.get("depTime") || new Date().toISOString(),
    arrivalTime: searchParams.get("arrTime") || new Date().toISOString(),
    basePrice: 4500, // Fixed INR equivalent for demo
  };

  const bookingId = searchParams.get("bookingId");
  const isSeatChange = !!bookingId;

  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepper State
  const queryStep = searchParams.get("step");
  const [step, setStep] = useState(queryStep ? parseInt(queryStep, 10) : 1);
  const totalSteps = 4;

  // Form State
  const [passenger, setPassenger] = useState({ firstName: "", lastName: "", email: "", documentId: "" });
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<Set<string>>(new Set());
  const [addons, setAddons] = useState({ checkedBags: 0, meal: "Standard", insurance: false });
  const [payment, setPayment] = useState({ cardNumber: "", expiry: "", cvv: "" });
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fetch On-Demand Seat Map without DB inserts
  useEffect(() => {
    const fetchMap = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${API_URL}/flights/seat-map`);
        url.searchParams.append("flightNumber", flightInfo.flightNumber);
        url.searchParams.append("date", flightInfo.departureTime);
        url.searchParams.append("basePrice", flightInfo.basePrice.toString());

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to load seat map");
        
        const data = await res.json();
        setSeats(data.seats || []);
      } catch (err: any) {
        setError(err.message || "Failed to load flight data");
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, []); // Run once on mount

  // Derived computations
  const selectedSeats = seats.filter((s) => selectedSeatNumbers.has(s.seatNumber));
  const seatsTotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const baggageTotal = addons.checkedBags * ADDON_PRICES.baggage;
  const insuranceTotal = addons.insurance ? ADDON_PRICES.insurance : 0;
  const mealTotal = ADDON_PRICES.meals[addons.meal] || 0;

  const estimatedTotal = seatsTotal === 0 ? flightInfo.basePrice : seatsTotal;
  const finalTotal = estimatedTotal + baggageTotal + insuranceTotal + mealTotal;

  const cols = ["A", "B", "C", "D", "E", "F"];
  const rows = 30; // Matches backend seat map generator

  const handleNext = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleCheckout = async () => {
    if (selectedSeats.length === 0) return;
    if (!user || !session) {
      router.push("/login");
      return;
    }

    setBookingLoading(true);
    setError(null);
    try {
      if (isSeatChange) {
        // Change Seat mode
        const res = await fetch(`${API_URL}/bookings/${bookingId}/seats`, {
          method: "POST", // Actually this is our PATCH/POST endpoint
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            seatNumbers: Array.from(selectedSeatNumbers),
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to change seats");
        }
      } else {
        // Standard Checkout mode
        const res = await fetch(`${API_URL}/bookings`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: user.id,
            flightNumber: flightInfo.flightNumber,
            airline: flightInfo.airline,
            origin: flightInfo.origin,
            destination: flightInfo.destination,
            departureTime: flightInfo.departureTime,
            arrivalTime: flightInfo.arrivalTime,
            basePrice: flightInfo.basePrice,
            seatNumbers: Array.from(selectedSeatNumbers),
            passengerName: `${passenger.firstName} ${passenger.lastName}`,
            passengerEmail: passenger.email,
            documentId: passenger.documentId,
            meal: addons.meal,
            checkedBags: addons.checkedBags,
            hasCancellationProtection: addons.insurance,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Booking failed");
        }
      }

      setBookingConfirmed(true);
    } catch (err: any) {
      setError(err.message || "Failed to finalize booking");
    } finally {
      setBookingLoading(false);
    }
  };

  const toggleSeat = (seatNum: string) => {
    setSelectedSeatNumbers((prev) => {
      const copy = new Set(prev);
      if (copy.has(seatNum)) copy.delete(seatNum);
      else {
        copy.clear();
        copy.add(seatNum);
      }
      return copy;
    });
  };

  const steps = isSeatChange 
    ? [{ id: 2, name: "Change Seat" }] 
    : [
        { id: 1, name: "Passenger" },
        { id: 2, name: "Seats" },
        { id: 3, name: "Add-ons" },
        { id: 4, name: "Payment" },
      ];

  // LOADING STATE
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="inline-block h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Generating real-time seat availability map...</p>
        </main>
      </>
    );
  }

  // ERROR STATE
  if (error || seats.length === 0) {
    return (
      <>
        <Navbar />
        <div className="flex flex-1 items-center justify-center py-32">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Unavailable</h1>
            <p className="text-muted-foreground mb-6">{error || "Seat map cannot be loaded at this time."}</p>
            <Link href="/flights" className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Back to Flights</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        
        {bookingConfirmed ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 p-12 text-center max-w-2xl mx-auto shadow-xl">
            <span className="text-6xl mb-6 block">🎫</span>
            <h2 className="text-3xl font-extrabold text-green-900 mb-3">{isSeatChange ? "Seat Successfully Changed!" : "Booking Confirmed!"}</h2>
            <p className="text-green-800 text-lg mb-4">
              {flightInfo.origin} to {flightInfo.destination} • Flight {flightInfo.flightNumber}
            </p>
            <div className="bg-white/60 p-6 rounded-xl text-left mb-8 backdrop-blur-sm border border-white/40">
              {isSeatChange ? (
                <p><strong>New Seat:</strong> {selectedSeats.map(s => s.seatNumber).join(", ")}</p>
              ) : (
                <>
                  <p><strong>Passenger:</strong> {passenger.firstName} {passenger.lastName}</p>
                  <p><strong>Seat:</strong> {selectedSeats.map(s => s.seatNumber).join(", ")} ({selectedSeats[0]?.seatClass.replace("_", " ")})</p>
                  <p><strong>Add-ons:</strong> {addons.checkedBags} Bags, {addons.meal} Meal {addons.insurance && ", Travel Insurance"}</p>
                  <p className="mt-4 text-xl font-bold text-green-900 border-t border-green-200 pt-4">Total Paid: ${finalTotal}</p>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-4">
              <Link href="/bookings" className="rounded-full bg-green-700 px-8 py-3 text-sm font-semibold text-white hover:bg-green-800 transition-colors shadow-lg">View My Bookings</Link>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Flight Info Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/10 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-primary">{flightInfo.airline} • {flightInfo.flightNumber}</p>
                  <p className="text-xs text-muted-foreground">{flightInfo.origin} → {flightInfo.destination}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">Real-Time JIT</span>
              </div>

              {/* Stepper Header */}
              <div className="glass rounded-2xl p-6 shadow-sm mb-6 flex items-center justify-between">
                {steps.map((s, idx) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${step >= s.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                      {s.id}
                    </div>
                    <span className={`ml-3 text-sm font-semibold hidden md:block ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>{s.name}</span>
                    {idx < steps.length - 1 && (
                      <div className={`w-8 md:w-16 h-1 mx-2 md:mx-4 rounded-full transition-colors ${step > s.id ? "bg-primary/50" : "bg-secondary"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Forms */}
              <AnimatePresence mode="wait">
                
                {/* Step 1: Passenger */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-white border border-border p-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6">Passenger Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">First Name</label>
                        <input type="text" value={passenger.firstName} onChange={e => setPassenger({...passenger, firstName: e.target.value})} className="w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" placeholder="John" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Last Name</label>
                        <input type="text" value={passenger.lastName} onChange={e => setPassenger({...passenger, lastName: e.target.value})} className="w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" placeholder="Doe" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address</label>
                        <input type="email" value={passenger.email} onChange={e => setPassenger({...passenger, email: e.target.value})} className="w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" placeholder="john@example.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Passport / ID Number</label>
                        <input type="text" value={passenger.documentId} onChange={e => setPassenger({...passenger, documentId: e.target.value})} className="w-full rounded-xl border border-border bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all" placeholder="A12345678" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleNext} disabled={!passenger.firstName || !passenger.lastName} className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue to Seats →</button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Seats */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-white border border-border p-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-2">Select Your Seat</h2>
                    <p className="text-muted-foreground mb-6 text-sm">Real-time availability mapped directly from database.</p>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mb-8 text-xs bg-gray-50 p-4 rounded-xl">
                      <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded border bg-gray-100 border-gray-300" /> Available</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded bg-primary shadow-sm" /> Selected</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded bg-gray-300 opacity-50" /> Booked</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded bg-amber-100 border border-amber-400" /> First Class</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded bg-blue-100 border border-blue-400" /> Business</span>
                    </div>

                    <div className="bg-white border rounded-3xl p-6 shadow-inner max-h-[500px] overflow-y-auto w-fit mx-auto">
                      <div className="grid grid-cols-[30px_repeat(3,40px)_30px_repeat(3,40px)] gap-1.5 justify-center mb-4 border-b pb-4">
                        <div />
                        {cols.slice(0, 3).map((c) => <div key={c} className="text-center text-xs font-bold text-gray-400">{c}</div>)}
                        <div /> {/* Aisle */}
                        {cols.slice(3).map((c) => <div key={c} className="text-center text-xs font-bold text-gray-400">{c}</div>)}
                      </div>

                      <div className="space-y-2">
                        {Array.from({ length: rows }, (_, r) => r + 1).map((row) => (
                          <div key={row} className="grid grid-cols-[30px_repeat(3,40px)_30px_repeat(3,40px)] gap-1.5 justify-center group">
                            <div className="flex items-center justify-center text-[10px] font-bold text-gray-400 group-hover:text-primary transition-colors">{row}</div>
                            {cols.map((col, ci) => {
                              const seat = seats.find((s) => s.seatNumber === `${row}${col}`);
                              if (!seat) return <div key={col} />;
                              const isSelected = selectedSeatNumbers.has(seat.seatNumber);
                              const isBooked = !seat.isAvailable;

                              return (
                                <div key={col} className="contents">
                                  {ci === 3 && <div className="w-full flex justify-center"><div className="w-px h-full bg-gray-100" /></div>}
                                  <button
                                    disabled={isBooked}
                                    onClick={() => toggleSeat(seat.seatNumber)}
                                    className={`relative h-10 w-10 rounded-t-lg rounded-b-sm text-[10px] font-bold border-t-4 transition-all duration-200
                                      ${isBooked ? "bg-gray-100 border-gray-300 text-transparent cursor-not-allowed opacity-60" 
                                        : isSelected ? `${seatClassSelectedColors[seat.seatClass]} shadow-lg scale-110 z-10` 
                                        : `${seatClassColors[seat.seatClass]} hover:scale-105 hover:shadow-md cursor-pointer`}`}
                                    title={isBooked ? "Booked" : `${seat.seatNumber} — $${seat.price}`}
                                  >
                                    {!isBooked && <span className={isSelected ? "text-white" : ""}>{seat.seatNumber}</span>}
                                    {isSelected && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white shadow-sm ring-2 ring-white text-[8px]">✓</span>}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between mt-8 pt-6 border-t">
                      {!isSeatChange && <button onClick={handlePrev} className="rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">← Back</button>}
                      {isSeatChange ? (
                        <button onClick={handleCheckout} disabled={selectedSeats.length === 0 || bookingLoading} className="rounded-xl ml-auto bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-green-600/20 hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                           {bookingLoading ? "Saving..." : "Confirm Seat Change"}
                        </button>
                      ) : (
                        <button onClick={handleNext} disabled={selectedSeats.length === 0} className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue to Add-ons →</button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Add-ons */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-white border border-border p-8 shadow-sm space-y-8">
                    <h2 className="text-2xl font-bold">Customize Your Journey</h2>
                    
                    {/* Baggage */}
                    <div className="flex items-center justify-between p-6 rounded-2xl border border-gray-100 bg-gray-50/50">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">🧳 Checked Baggage</h3>
                        <p className="text-sm text-muted-foreground mt-1">23kg max per bag. +${ADDON_PRICES.baggage} each.</p>
                      </div>
                      <div className="flex items-center bg-white border rounded-full p-1 shadow-sm">
                        <button onClick={() => setAddons(a => ({...a, checkedBags: Math.max(0, a.checkedBags - 1)}))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-lg font-medium transition-colors">-</button>
                        <span className="w-10 text-center font-bold">{addons.checkedBags}</span>
                        <button onClick={() => setAddons(a => ({...a, checkedBags: a.checkedBags + 1}))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-lg font-medium transition-colors">+</button>
                      </div>
                    </div>

                    {/* Meal Preferences */}
                    <div className="flex items-center justify-between p-6 rounded-2xl border border-gray-100 bg-gray-50/50">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">🍽️ Meal Preference</h3>
                        <p className="text-sm text-muted-foreground mt-1">Choose your in-flight meal.</p>
                      </div>
                      <select value={addons.meal} onChange={e => setAddons(a => ({...a, meal: e.target.value}))} className="rounded-xl border bg-white px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 min-w-[150px]">
                        <option value="Standard">Standard (+$0)</option>
                        <option value="Vegetarian">Vegetarian (+$15)</option>
                        <option value="Vegan">Vegan (+$20)</option>
                        <option value="Halal">Halal (+$25)</option>
                        <option value="Kosher">Kosher (+$30)</option>
                      </select>
                    </div>

                    {/* Insurance */}
                    <div className="flex items-center justify-between p-6 rounded-2xl border border-blue-100 bg-blue-50/30">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-900">🛡️ Travel Insurance</h3>
                        <p className="text-sm text-blue-700/80 mt-1">Cancellation protection & medical cover. +${ADDON_PRICES.insurance}.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={addons.insurance} onChange={e => setAddons(a => ({...a, insurance: e.target.checked}))} />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex justify-between mt-8 pt-6 border-t">
                      <button onClick={handlePrev} className="rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">← Back</button>
                      <button onClick={handleNext} className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-all">Review & Pay →</button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Payment */}
                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-white border border-border p-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
                    <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                      <div className="flex gap-4 mb-6">
                        <div className="h-10 w-16 bg-white border rounded shadow-sm flex items-center justify-center font-bold text-gray-500 italic">VISA</div>
                        <div className="h-10 w-16 bg-white border rounded shadow-sm flex items-center justify-center font-bold text-red-500 italic">MC</div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Card Number</label>
                          <input type="text" value={payment.cardNumber} onChange={e => setPayment({...payment, cardNumber: e.target.value})} placeholder="0000 0000 0000 0000" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expiry Date</label>
                            <input type="text" value={payment.expiry} onChange={e => setPayment({...payment, expiry: e.target.value})} placeholder="MM/YY" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">CVV</label>
                            <input type="text" value={payment.cvv} onChange={e => setPayment({...payment, cvv: e.target.value})} placeholder="123" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-600 font-medium">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-between mt-8 pt-6 border-t">
                      <button onClick={handlePrev} className="rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">← Back</button>
                      <button onClick={handleCheckout} disabled={!payment.cardNumber || bookingLoading} className="rounded-xl bg-gradient-to-r from-primary to-blue-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
                        {bookingLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing JIT...
                          </span>
                        ) : (
                          <>
                            <span>Pay ${finalTotal}</span>
                            <span>🔒</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Sticky Pricing Sidebar */}
            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sticky top-24 rounded-3xl bg-white border border-border p-6 shadow-xl shadow-black/5">
                <h3 className="text-xl font-bold mb-6 pb-4 border-b">Order Summary</h3>
                
                <div className="space-y-6">
                  {/* Flight Info */}
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Flight</p>
                    <div className="flex justify-between items-start font-medium">
                      <span>{flightInfo.origin} → {flightInfo.destination}</span>
                      <span className="text-right">${flightInfo.basePrice}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{flightInfo.flightNumber} • {new Date(flightInfo.departureTime).toLocaleDateString()}</p>
                  </div>

                  {/* Seat Info */}
                  {selectedSeats.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t pt-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Seat</p>
                      {selectedSeats.map(seat => (
                        <div key={seat.id} className="flex justify-between items-start text-sm">
                          <span>Seat {seat.seatNumber} <span className="text-muted-foreground text-xs ml-1">({seat.seatClass.replace("_", " ")})</span></span>
                          <span className="font-medium">${seat.price - flightInfo.basePrice > 0 ? `+${seat.price - flightInfo.basePrice}` : 'Included'}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Addons Info */}
                  {!isSeatChange && (addons.checkedBags > 0 || addons.insurance || mealTotal > 0) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t pt-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Add-ons</p>
                      {addons.checkedBags > 0 && (
                        <div className="flex justify-between items-start text-sm mb-2">
                          <span>{addons.checkedBags}x Checked Bag</span>
                          <span className="font-medium">+${baggageTotal}</span>
                        </div>
                      )}
                      {mealTotal > 0 && (
                        <div className="flex justify-between items-start text-sm mb-2">
                          <span>{addons.meal} Meal</span>
                          <span className="font-medium">+${mealTotal}</span>
                        </div>
                      )}
                      {addons.insurance && (
                        <div className="flex justify-between items-start text-sm text-blue-700">
                          <span>Travel Insurance</span>
                          <span className="font-medium">+${insuranceTotal}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {!isSeatChange && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Due</p>
                        <p className="text-xs text-muted-foreground mt-1">Includes all taxes and fees</p>
                      </div>
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={finalTotal}
                          initial={{ opacity: 0, scale: 0.8, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="text-3xl font-extrabold text-primary"
                        >
                          ${finalTotal}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                )}

              </motion.div>
            </div>

          </div>
        )}
      </main>
    </>
  );
}
