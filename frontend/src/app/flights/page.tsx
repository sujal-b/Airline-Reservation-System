"use client";

import Navbar from "@/components/navbar";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState, useCallback } from "react";

// Major Indian airports for the dropdown
const INDIAN_AIRPORTS = [
  { code: "DEL", city: "New Delhi", name: "Indira Gandhi Intl" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Intl" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda Intl" },
  { code: "MAA", city: "Chennai", name: "Chennai Intl" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose Intl" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi Intl" },
  { code: "GOI", city: "Goa", name: "Manohar Intl" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel Intl" },
  { code: "PNQ", city: "Pune", name: "Pune Airport" },
  { code: "COK", city: "Kochi", name: "Cochin Intl" },
  { code: "JAI", city: "Jaipur", name: "Jaipur Intl" },
  { code: "GAU", city: "Guwahati", name: "Lokpriya Gopinath Bordoloi Intl" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh Intl" },
  { code: "IXC", city: "Chandigarh", name: "Chandigarh Intl" },
  { code: "PAT", city: "Patna", name: "Jay Prakash Narayan Intl" },
  { code: "SXR", city: "Srinagar", name: "Sheikh ul-Alam Intl" },
  { code: "TRV", city: "Thiruvananthapuram", name: "Trivandrum Intl" },
  { code: "VNS", city: "Varanasi", name: "Lal Bahadur Shastri Intl" },
  { code: "IXB", city: "Bagdogra", name: "Bagdogra Airport" },
  { code: "RPR", city: "Raipur", name: "Swami Vivekananda Airport" },
];

// Demo flights as fallback data (used when API call fails or for pre-existing bookings)
const DEMO_FLIGHTS = [
  { id: "f1", flightIata: "SV-101", airline: "SkyVoyage Airways", departure: { iata: "DXB", airport: "Dubai Intl", scheduled: "2026-04-15T08:00:00" }, arrival: { iata: "LHR", airport: "London Heathrow", scheduled: "2026-04-15T14:30:00" }, status: "scheduled", aircraft: "B787" },
  { id: "f2", flightIata: "SV-205", airline: "SkyVoyage Airways", departure: { iata: "JFK", airport: "New York JFK", scheduled: "2026-04-16T22:00:00" }, arrival: { iata: "CDG", airport: "Paris CDG", scheduled: "2026-04-17T10:15:00" }, status: "scheduled", aircraft: "A380" },
  { id: "f3", flightIata: "SV-310", airline: "SkyVoyage Airways", departure: { iata: "NRT", airport: "Tokyo Narita", scheduled: "2026-04-17T01:30:00" }, arrival: { iata: "DXB", airport: "Dubai Intl", scheduled: "2026-04-17T08:45:00" }, status: "scheduled", aircraft: "B777" },
  { id: "f4", flightIata: "SV-412", airline: "SkyVoyage Airways", departure: { iata: "LHR", airport: "London Heathrow", scheduled: "2026-04-18T11:00:00" }, arrival: { iata: "JFK", airport: "New York JFK", scheduled: "2026-04-18T14:00:00" }, status: "scheduled", aircraft: "A350" },
  { id: "f5", flightIata: "SV-520", airline: "SkyVoyage Airways", departure: { iata: "CDG", airport: "Paris CDG", scheduled: "2026-04-19T13:45:00" }, arrival: { iata: "NRT", airport: "Tokyo Narita", scheduled: "2026-04-20T08:00:00" }, status: "scheduled", aircraft: "B787" },
  { id: "f6", flightIata: "SV-601", airline: "SkyVoyage Airways", departure: { iata: "DXB", airport: "Dubai Intl", scheduled: "2026-04-20T06:30:00" }, arrival: { iata: "CDG", airport: "Paris CDG", scheduled: "2026-04-20T11:45:00" }, status: "scheduled", aircraft: "A320" },
];

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return "--:--"; }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch { return ""; }
}

function getDuration(dep: string, arr: string) {
  try {
    const ms = new Date(arr).getTime() - new Date(dep).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  } catch { return ""; }
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  landed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
  incident: "bg-amber-100 text-amber-700",
  diverted: "bg-purple-100 text-purple-700",
};

export default function FlightsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "demo">("live");

  const searchLive = useCallback(async () => {
    if (!from || !to) return;
    if (from === to) { setError("Origin and destination must be different."); return; }
    
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/flights/live?dep=${from}&arr=${to}`);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setFlights([]);
        setError("No flights found for this route. Try a different route or switch to Demo Flights.");
      } else {
        setFlights(data);
      }
    } catch (err) {
      setError("Could not reach the backend. Is the backend running on port 4000?");
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const showDemo = () => {
    setMode("demo");
    setFlights(DEMO_FLIGHTS);
    setSearched(true);
    setError(null);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">

        {/* Top mode toggle */}
        <div className="flex items-center justify-between mb-6">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold">
            {mode === "live" ? "🇮🇳 Search Indian Flights" : "Search Flights"}
          </motion.h1>
          <div className="flex rounded-full bg-secondary p-1 text-xs font-medium">
            <button onClick={() => { setMode("live"); setFlights([]); setSearched(false); }} className={`px-4 py-1.5 rounded-full transition-all ${mode === "live" ? "bg-primary text-white shadow-md" : "text-muted-foreground"}`}>Live Flights</button>
            <button onClick={showDemo} className={`px-4 py-1.5 rounded-full transition-all ${mode === "demo" ? "bg-primary text-white shadow-md" : "text-muted-foreground"}`}>Demo Flights</button>
          </div>
        </div>

        {/* Search Bar */}
        {mode === "live" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">From</label>
                <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="">Select origin airport</option>
                  {INDIAN_AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>{a.city} ({a.code}) — {a.name}</option>
                  ))}
                </select>
              </div>

              {/* Swap button */}
              <button onClick={() => { const tmp = from; setFrom(to); setTo(tmp); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white hover:bg-secondary transition-all shadow-sm" title="Swap">⇆</button>

              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">To</label>
                <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="">Select destination airport</option>
                  {INDIAN_AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>{a.city} ({a.code}) — {a.name}</option>
                  ))}
                </select>
              </div>

              <button onClick={searchLive} disabled={!from || !to || loading} className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching...
                  </span>
                ) : "Search Flights ✈️"}
              </button>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</motion.p>
            )}
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {searched && !loading && flights.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                {mode === "live" ? `Showing ${flights.length} live flight(s) for ${INDIAN_AIRPORTS.find(a=>a.code===from)?.city || from} → ${INDIAN_AIRPORTS.find(a=>a.code===to)?.city || to}` : `Showing ${flights.length} demo flight(s)`}
              </p>

              {flights.map((flight, i) => (
                <motion.div key={flight.flightIata + i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl bg-white border border-border p-6 shadow-sm hover:shadow-md transition-all group">
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Airline */}
                    <div className="flex items-center gap-4 min-w-[180px]">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-blue-100 flex items-center justify-center font-bold text-primary text-xs">{flight.airlineIata || "✈"}</div>
                      <div>
                        <p className="font-semibold text-sm">{flight.airline}</p>
                        <p className="text-xs text-muted-foreground">{flight.flightIata}</p>
                      </div>
                    </div>

                    {/* Center: Route */}
                    <div className="flex items-center gap-3 flex-1 justify-center">
                      <div className="text-right">
                        <p className="text-xl font-bold">{formatTime(flight.departure.scheduled)}</p>
                        <p className="text-xs text-muted-foreground font-medium">{flight.departure.iata}</p>
                      </div>

                      <div className="flex flex-col items-center w-32">
                        <p className="text-[10px] text-muted-foreground mb-1">{getDuration(flight.departure.scheduled, flight.arrival.scheduled)}</p>
                        <div className="relative w-full flex items-center">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span className="h-px flex-1 bg-gradient-to-r from-primary/50 to-primary/20" />
                          <span className="text-primary text-xs absolute left-1/2 -translate-x-1/2 -top-0.5">✈</span>
                          <span className="h-px flex-1 bg-gradient-to-r from-primary/20 to-primary/50" />
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Direct</p>
                      </div>

                      <div className="text-left">
                        <p className="text-xl font-bold">{formatTime(flight.arrival.scheduled)}</p>
                        <p className="text-xs text-muted-foreground font-medium">{flight.arrival.iata}</p>
                      </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex items-center gap-4 justify-end">
                      <div className="text-center hidden lg:block">
                        <p className="text-[10px] text-muted-foreground">Date</p>
                        <p className="text-xs font-medium">{formatDate(flight.departure.scheduled)}</p>
                      </div>
                      {flight.status && (
                        <span className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold capitalize ${statusColors[flight.status] || "bg-gray-100 text-gray-600"}`}>{flight.status}</span>
                      )}
                      {mode === "demo" ? (
                        <Link href={`/flights/${flight.id}`} className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-opacity-90 transition-all shadow-md shadow-primary/20 whitespace-nowrap">Select Seats</Link>
                      ) : (
                        <Link href={`/flights/f1?live=${encodeURIComponent(flight.flightIata)}&airline=${encodeURIComponent(flight.airline)}&dep=${flight.departure.iata}&arr=${flight.arrival.iata}&depTime=${encodeURIComponent(flight.departure.scheduled)}&arrTime=${encodeURIComponent(flight.arrival.scheduled)}`} className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-opacity-90 transition-all shadow-md shadow-primary/20 whitespace-nowrap">Book Flight</Link>
                      )}
                    </div>
                  </div>

                  {/* Extra detail row */}
                  <div className="mt-3 pt-3 border-t border-border/30 flex gap-4 text-xs text-muted-foreground">
                    <span>{flight.departure.airport} → {flight.arrival.airport}</span>
                    {flight.aircraft && <span>Aircraft: {flight.aircraft}</span>}
                    {flight.departure.terminal && <span>Terminal: {flight.departure.terminal}</span>}
                    {flight.departure.gate && <span>Gate: {flight.departure.gate}</span>}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {searched && !loading && flights.length === 0 && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <span className="text-5xl block mb-4">🔍</span>
              <h2 className="text-xl font-semibold mb-2">No flights found</h2>
              <p className="text-muted-foreground text-sm">Try searching a different route or switch to Demo Flights.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-white border border-border p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/5" />
                  </div>
                  <div className="h-8 w-24 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </>
  );
}
