"use client";

import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-10">
      <div className="w-full max-w-[700px] flex flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-xs uppercase tracking-[0.25em] text-accent"
        >
          Bookinder
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-dark"
        >
          Find Any Book PDF Instantly
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-4 text-sm sm:text-base text-dark/60"
        >
          Search across the public web for freely available PDF editions of the books you love.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="w-full mt-8 sm:mt-10"
        >
          <SearchBar />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-xs text-dark/40"
        >
          Try “Atomic Habits”, “Meditations”, or “Clean Code”.
        </motion.p>
      </div>
    </main>
  );
}
