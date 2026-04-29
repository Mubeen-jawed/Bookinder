"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";

const BOOK_FACTS: string[] = [
  "The longest novel ever written is Marcel Proust's “In Search of Lost Time” — over 1.2 million words across 4,000+ pages.",
  "The world's smallest book, “Teeny Ted from Turnip Town”, is etched onto a microchip and only readable with an electron microscope.",
  "Bibliosmia is the word for the love of the smell of old books — caused by the breakdown of lignin in the paper.",
  "The first book ever printed with movable type in Europe was the Gutenberg Bible, around 1455.",
  "“Harry Potter and the Philosopher's Stone” was rejected by 12 publishers before Bloomsbury said yes.",
  "Iceland reads more books per capita than any other country, and most are gifted on Christmas Eve in a tradition called Jólabókaflóð.",
  "The Library of Congress holds over 170 million items, including roughly 41 million books.",
  "Agatha Christie remains the best-selling novelist of all time — over 2 billion copies sold.",
  "Tsundoku is a Japanese word for the habit of acquiring books and letting them pile up unread.",
  "Dr. Seuss wrote “Green Eggs and Ham” on a bet that he couldn't write a book using only 50 different words.",
  "The Bible is the most translated book in the world, available in over 700 languages.",
  "The world's oldest known printed book is the Diamond Sutra, printed in China in 868 AD — almost 600 years before Gutenberg.",
  "Stephen King wrote “The Running Man” in just one week.",
  "“Don Quixote” by Cervantes is widely considered the first modern novel — published in 1605.",
  "A bibliophile collects books; a bibliotaph hides them away from others.",
  "Until the 19th century, books were so valuable some libraries chained them to the shelves.",
  "Mark Twain was the first major author to submit a typewritten manuscript to a publisher (“Life on the Mississippi”, 1883).",
  "The longest sentence ever printed in literature is in “Les Misérables” — 823 words long.",
  "The word “novel” comes from the Italian “novella”, meaning “new”.",
  "J.R.R. Tolkien took 12 years to write “The Lord of the Rings”.",
];

function pickRandomFact(exclude: string | null): string {
  if (BOOK_FACTS.length <= 1) return BOOK_FACTS[0];
  let next = BOOK_FACTS[Math.floor(Math.random() * BOOK_FACTS.length)];
  // Avoid repeating the same fact twice in a row.
  let guard = 0;
  while (next === exclude && guard < 5) {
    next = BOOK_FACTS[Math.floor(Math.random() * BOOK_FACTS.length)];
    guard++;
  }
  return next;
}

export default function LandingPage() {
  const [fact, setFact] = useState<string | null>(null);

  const handleShowFact = () => {
    setFact((prev) => pickRandomFact(prev));
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
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

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 w-full flex flex-col items-center"
        >
          <motion.button
            type="button"
            onClick={handleShowFact}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 bg-white border border-border text-dark/80 hover:text-primary hover:border-primary text-sm font-medium h-10 px-4 sm:px-5 rounded-full shadow-soft transition-colors duration-300"
            aria-expanded={fact !== null}
            aria-controls="random-book-fact"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-accent"
              aria-hidden="true"
            >
              <path d="M12 3a9 9 0 1 0 9 9" />
              <path d="M12 8v4l2 2" />
              <path d="M21 3v6h-6" />
            </svg>
            {fact ? "Another fact" : "Know a random fact about books"}
          </motion.button>

          <AnimatePresence mode="wait">
            {fact && (
              <motion.div
                key={fact}
                id="random-book-fact"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="mt-4 w-full bg-white border border-border rounded-2xl px-5 py-4 shadow-soft text-sm text-dark/80 leading-relaxed"
                role="status"
                aria-live="polite"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
                  Did you know?
                </p>
                {fact}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
