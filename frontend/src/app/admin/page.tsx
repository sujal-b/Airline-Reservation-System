"use client";

import Navbar from "@/components/navbar";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getAPIUrl } from "@/lib/api";

const API_URL = getAPIUrl();

// Demo data for admin
const DEMO_STATS = {
  totalFlights: 24,
  activeBookings: 156,
  totalRevenue: 142800,
  avgOccupancy: 78,
};

const DEMO_ADMIN_FLIGHTS = [
  {
    id: "f1",
    flightNumber: "SV-101",
    origin: "DXB",
    destination: "LHR",
    departureTime: "2026-04-15T08:00:00",
    status: "SCHEDULED",
    occupancy: 82,
    revenue: 38250,
  },
  {
    id: "f2",
    flightNumber: "SV-205",
    origin: "JFK",
    destination: "CDG",
    departureTime: "2026-04-16T22:00:00",
    status: "SCHEDULED",
    occupancy: 67,
    revenue: 29400,
  },
  {
    id: "f3",
    flightNumber: "SV-310",
    origin: "NRT",
    destination: "DXB",
    departureTime: "2026-04-17T01:30:00",
    status: "SCHEDULED",
    occupancy: 91,
    revenue: 45200,
  },
  {
    id: "f4",
    flightNumber: "SV-412",
    origin: "LHR",
    destination: "JFK",
    departureTime: "2026-04-18T11:00:00",
    status: "DELAYED",
    occupancy: 55,
    revenue: 18900,
  },
  {
    id: "f5",
    flightNumber: "SV-520",
    origin: "CDG",
    destination: "NRT",
    departureTime: "2026-04-19T13:45:00",
    status: "SCHEDULED",
    occupancy: 95,
    revenue: 52000,
  },
];

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-green-100 text-green-700",
  DELAYED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-600",
  COMPLETED: "bg-gray-100 text-gray-600",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "flights" | "add">(
    "overview"
  );
  
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !session) {
      router.push("/");
      return;
    }

    // Verify Admin Role securely via our new backend SupabaseAuthGuard endpoint
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    .then(async res => {
      if (res.ok) {
        const data = await res.json();
        if (data?.role === 'ADMIN') {
          setIsAdmin(true);
          return;
        }
      }
      router.push("/");
    })
    .catch(() => router.push("/"));
  }, [user, session, authLoading]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Manage flights, view analytics, and schedule new routes.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          {(
            [
              ["overview", "📊 Overview"],
              ["flights", "✈️ Manage Flights"],
              ["add", "➕ Add Flight"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Flights",
                  value: DEMO_STATS.totalFlights,
                  icon: "✈️",
                  color: "from-blue-500 to-blue-600",
                },
                {
                  label: "Active Bookings",
                  value: DEMO_STATS.activeBookings,
                  icon: "🎫",
                  color: "from-emerald-500 to-emerald-600",
                },
                {
                  label: "Total Revenue",
                  value: `$${DEMO_STATS.totalRevenue.toLocaleString()}`,
                  icon: "💰",
                  color: "from-amber-500 to-amber-600",
                },
                {
                  label: "Avg Occupancy",
                  value: `${DEMO_STATS.avgOccupancy}%`,
                  icon: "📈",
                  color: "from-purple-500 to-purple-600",
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-2xl bg-gradient-to-br ${stat.color} p-6 text-white shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-white/80">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Revenue Chart Placeholder */}
            <div className="rounded-2xl bg-white border border-border p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4">
                Revenue Trend (Last 7 Days)
              </h3>
              <div className="flex items-end gap-2 h-40">
                {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex-1 rounded-t-lg bg-gradient-to-t from-primary/80 to-primary/30"
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span key={d} className="flex-1 text-center">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Manage Flights Tab */}
        {activeTab === "flights" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left px-6 py-3 font-medium">Flight</th>
                    <th className="text-left px-6 py-3 font-medium">Route</th>
                    <th className="text-left px-6 py-3 font-medium">Date</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                    <th className="text-left px-6 py-3 font-medium">
                      Occupancy
                    </th>
                    <th className="text-left px-6 py-3 font-medium">
                      Revenue
                    </th>
                    <th className="text-left px-6 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_ADMIN_FLIGHTS.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">
                        {f.flightNumber}
                      </td>
                      <td className="px-6 py-4">
                        {f.origin} → {f.destination}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(f.departureTime).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[f.status]}`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${f.occupancy > 85 ? "bg-red-500" : f.occupancy > 60 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${f.occupancy}%` }}
                            />
                          </div>
                          <span className="text-xs">{f.occupancy}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        ${f.revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-xs text-primary font-medium hover:underline mr-3">
                          Edit
                        </button>
                        <button className="text-xs text-red-500 font-medium hover:underline">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Add Flight Tab */}
        {activeTab === "add" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl"
          >
            <div className="rounded-2xl bg-white border border-border p-8 shadow-sm">
              <h2 className="text-lg font-bold mb-6">Schedule New Flight</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Flight Number
                  </label>
                  <input
                    type="text"
                    placeholder="SV-700"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Aircraft
                  </label>
                  <select className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                    <option>Boeing 787</option>
                    <option>Airbus A380</option>
                    <option>Boeing 777</option>
                    <option>Airbus A350</option>
                    <option>Airbus A320</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Origin
                  </label>
                  <input
                    type="text"
                    placeholder="DXB"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Destination
                  </label>
                  <input
                    type="text"
                    placeholder="LHR"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Departure
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Arrival
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Base Price ($)
                  </label>
                  <input
                    type="number"
                    placeholder="450"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <button className="mt-6 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-all">
                Schedule Flight
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </>
  );
}
