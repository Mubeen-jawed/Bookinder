"use client";

import { useEffect, useState } from "react";

type LoaderProps = {
  count?: number;
};

const QUOTES = [
  "“A reader lives a thousand lives before he dies.” — George R.R. Martin",
  "“So many books, so little time.” — Frank Zappa",
  "“The reading of all good books is like a conversation with the finest minds of past centuries.” — Descartes",
  "“A book is a dream that you hold in your hands.” — Neil Gaiman",
  "“There is no friend as loyal as a book.” — Ernest Hemingway",
  "“Once you learn to read, you will be forever free.” — Frederick Douglass",
  "“Books are a uniquely portable magic.” — Stephen King",
  "“Reading is to the mind what exercise is to the body.” — Joseph Addison",
  "“We read to know we are not alone.” — C.S. Lewis",
  "“A room without books is like a body without a soul.” — Cicero",
  "“Sleep is good, he said, and books are better.” — George R.R. Martin",
  "“Books are mirrors: you only see in them what you already have inside you.” — Carlos Ruiz Zafón",
  "“I have always imagined that paradise will be a kind of library.” — Jorge Luis Borges",
  "“Reading is a discount ticket to everywhere.” — Mary Schmich",
  "“The more that you read, the more things you will know.” — Dr. Seuss",
];

function pickRandom() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export default function Loader({ count = 5 }: LoaderProps) {
  const [quote, setQuote] = useState<string>(QUOTES[0]);

  useEffect(() => {
    setQuote(pickRandom());
    const interval = setInterval(() => setQuote(pickRandom()), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-col gap-4"
      aria-label="Loading results"
      role="status"
    >
      <div className="bg-white border border-border rounded-xl px-5 py-4 shadow-soft text-center">
        <p className="text-xs uppercase tracking-wide text-accent mb-1">
          Searching the stacks…
        </p>
        <p
          key={quote}
          className="text-sm md:text-base text-dark/80 italic animate-fade-in font-serif"
        >
          {quote}
        </p>
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-border rounded-xl p-4 sm:p-5 shadow-soft flex gap-3 sm:gap-4"
        >
          <div className="shrink-0 w-20 h-28 sm:w-24 sm:h-36 rounded-md shimmer animate-shimmer" />
          <div className="flex-1 min-w-0">
            <div className="h-5 w-3/4 rounded-md shimmer animate-shimmer" />
            <div className="mt-3 h-3 w-1/4 rounded-md shimmer animate-shimmer" />
            <div className="mt-4 h-3 w-full rounded-md shimmer animate-shimmer" />
            <div className="mt-2 h-3 w-5/6 rounded-md shimmer animate-shimmer" />
            <div className="mt-5 flex gap-3">
              <div className="h-9 w-28 rounded-full shimmer animate-shimmer" />
              <div className="h-9 w-24 rounded-full shimmer animate-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
