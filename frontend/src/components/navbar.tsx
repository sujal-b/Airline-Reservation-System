"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 glass"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SkyVoyage
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link
            href="/flights"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Flights
          </Link>
          {user && (
            <Link
              href="/bookings"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              My Bookings
            </Link>
          )}
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Admin
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-6">
          {user ? (
            <button
              onClick={signOut}
              className="text-sm font-semibold text-muted-foreground hover:text-red-500 transition-colors"
            >
              Log Out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Sign In
            </Link>
          )}
          <Link
            href="/flights"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            Book Now
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
