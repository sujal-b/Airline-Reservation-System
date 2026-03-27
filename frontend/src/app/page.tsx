"use client";

import Navbar from "@/components/navbar";
import Link from "next/link";
import { motion } from "motion/react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const destinations = [
  { city: "Dubai", code: "DXB", emoji: "🏜️" },
  { city: "Paris", code: "CDG", emoji: "🗼" },
  { city: "Tokyo", code: "NRT", emoji: "🏯" },
  { city: "New York", code: "JFK", emoji: "🗽" },
];

export default function Home() {
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[var(--color-sky-start)] via-[var(--color-sky-mid)] to-white px-6 py-24 text-center">
        {/* Animated decorative circles */}
        <motion.div
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="relative z-10 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-6xl"
        >
          Travel the World with{" "}
          <span className="bg-gradient-to-r from-primary via-blue-500 to-accent bg-clip-text text-transparent">
            Elegance
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="relative z-10 mt-6 max-w-xl text-lg text-muted-foreground"
        >
          Book premium flights, choose your seats in real-time, and experience a
          seamless journey from search to boarding pass.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/flights"
            className="rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:scale-105"
          >
            Search Flights
          </Link>
          <Link
            href="/bookings"
            className="rounded-full border-2 border-primary/20 bg-white/60 px-8 py-3.5 text-base font-semibold text-primary backdrop-blur-sm transition-all hover:bg-primary/5"
          >
            My Bookings
          </Link>
        </motion.div>
      </section>

      {/* Popular Destinations */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center text-3xl font-bold tracking-tight"
        >
          Popular Destinations
        </motion.h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((d, i) => (
            <motion.div
              key={d.code}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group glass rounded-2xl p-6 shadow-sm transition-shadow hover:shadow-xl cursor-pointer"
            >
              <span className="text-4xl">{d.emoji}</span>
              <h3 className="mt-4 text-lg font-semibold">{d.city}</h3>
              <p className="text-sm text-muted-foreground">{d.code}</p>
              <div className="mt-4 h-0.5 w-0 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-b from-white to-secondary/30 px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-3xl font-bold tracking-tight"
          >
            Why SkyVoyage?
          </motion.h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "Real-time Seat Map",
                desc: "See live availability and pick your perfect seat instantly.",
              },
              {
                icon: "💎",
                title: "Dynamic Pricing",
                desc: "AI-driven fares that match demand — always fair, always transparent.",
              },
              {
                icon: "🚀",
                title: "Instant Boarding Pass",
                desc: "Get a QR-coded mobile boarding pass the second you book.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="rounded-2xl bg-white p-8 shadow-sm"
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/50 px-6 py-10 text-center text-sm text-muted-foreground backdrop-blur-sm">
        <p>© 2026 SkyVoyage Airlines. All rights reserved.</p>
        <p className="mt-1 text-xs opacity-60">
          Built with Next.js • NestJS • Supabase
        </p>
      </footer>
    </>
  );
}
