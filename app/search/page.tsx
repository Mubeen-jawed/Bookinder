"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Loader from "@/components/Loader";
import ResultCard from "@/components/ResultCard";
import SearchBar from "@/components/SearchBar";
import type { BookResult } from "@/lib/google";

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  const [results, setResults] = useState<BookResult[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(query));
  const [secondaryLoading, setSecondaryLoading] = useState<boolean>(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setResults([]);
      setSuggestion(null);
      setHasSearched(false);
      setSecondaryLoaded(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setHasSearched(false);
    setSecondaryLoaded(false);
    setSecondaryLoading(false);

    const mergeResults = (prev: BookResult[], incoming: BookResult[]) => {
      const seen = new Set(prev.map((r) => normalizeTitle(r.title)));
      const merged = [...prev];
      for (const r of incoming) {
        const key = normalizeTitle(r.title);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(r);
      }
      return merged;
    };

    (async () => {
      let primaryResults: BookResult[] = [];
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&tier=primary`,
          { signal: controller.signal }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "Failed to fetch results.");
        }
        primaryResults = data.results ?? [];
        setResults(primaryResults);
        setSuggestion(data.suggestion ?? null);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setResults([]);
        setSuggestion(null);
        setLoading(false);
        setHasSearched(true);
        return;
      }

      // If primary found nothing, keep the loader visible while we try
      // the secondary tier (Internet Archive + Open Library) inline.
      if (primaryResults.length === 0) {
        try {
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(query)}&tier=secondary`,
            { signal: controller.signal }
          );
          if (response.ok) {
            const data = await response.json();
            const incoming: BookResult[] = data.results ?? [];
            setResults((prev) => mergeResults(prev, incoming));
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        } finally {
          setSecondaryLoaded(true);
        }
      }

      setLoading(false);
      setHasSearched(true);
    })();

    return () => controller.abort();
  }, [query]);

  // When primary returned results, lazy-load the secondary tier on scroll.
  useEffect(() => {
    if (!query || loading || secondaryLoaded || secondaryLoading) return;
    if (results.length === 0) return;
    const node = sentinelRef.current;
    if (!node) return;

    const controller = new AbortController();
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setSecondaryLoading(true);

        fetch(`/api/search?q=${encodeURIComponent(query)}&tier=secondary`, {
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok) return;
            const data = await response.json();
            const incoming: BookResult[] = data.results ?? [];
            setResults((prev) => {
              const seen = new Set(prev.map((r) => normalizeTitle(r.title)));
              const merged = [...prev];
              for (const r of incoming) {
                const key = normalizeTitle(r.title);
                if (seen.has(key)) continue;
                seen.add(key);
                merged.push(r);
              }
              return merged;
            });
          })
          .catch(() => {})
          .finally(() => {
            setSecondaryLoading(false);
            setSecondaryLoaded(true);
          });
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);

    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [query, loading, secondaryLoaded, secondaryLoading, results.length]);

  return (
    <main className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="font-serif text-base sm:text-xl text-dark hover:text-primary transition-colors duration-300 shrink-0"
          >
            Bookinder
          </Link>
          <div className="flex-1 min-w-0">
            <SearchBar initialQuery={query} compact />
          </div>
        </div>
      </header>

      <section className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {query ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-dark/60 mb-6"
          >
            {!loading && results.length > 0 && (
              <>
                <span className="text-dark font-medium">{results.length}</span>
                {" "}
                {results.length === 1 ? "result" : "results"}
                {" "}for{" "}
              </>
            )}
            {(loading || results.length === 0) && <>Results for{" "}</>}
            <span className="text-dark font-medium">“{query}”</span>
          </motion.p>
        ) : (
          <p className="text-sm text-dark/60 mb-6">
            Enter a book name above to begin.
          </p>
        )}

        {!loading && suggestion && (
          <div className="mb-6 bg-white border border-border rounded-xl px-5 py-3 text-sm text-dark/80 shadow-soft">
            Did you mean{" "}
            <Link
              href={`/search?q=${encodeURIComponent(suggestion)}`}
              className="font-medium text-primary hover:underline"
            >
              {suggestion}
            </Link>
            ?
          </div>
        )}

        {loading && <Loader />}

        {!loading && error && (
          <div className="bg-white border border-border rounded-xl p-8 text-center shadow-soft">
            <h2 className="font-serif text-xl text-dark">Something went wrong</h2>
            <p className="mt-2 text-sm text-dark/60">{error}</p>
          </div>
        )}

        {!loading && !error && query && hasSearched && results.length === 0 && (
          <div className="bg-white border border-border rounded-xl p-10 text-center shadow-soft">
            <h2 className="font-serif text-xl text-dark">No PDFs found</h2>
            <p className="mt-2 text-sm text-dark/60">
              No PDFs found. Try a different search.
            </p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="flex flex-col gap-4">
            {results.map((result, index) => (
              <ResultCard
                key={`${result.link}-${index}`}
                result={result}
                index={index}
              />
            ))}
          </div>
        )}

        {!loading && !error && results.length > 0 && !secondaryLoaded && (
          <div ref={sentinelRef} className="mt-6">
            {secondaryLoading && <Loader count={2} />}
          </div>
        )}
      </section>
    </main>
  );
}

function SearchFallback() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="font-serif text-base sm:text-xl text-dark hover:text-primary transition-colors duration-300 shrink-0"
          >
            Bookinder
          </Link>
        </div>
      </header>
      <section className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Loader />
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchResults />
    </Suspense>
  );
}
