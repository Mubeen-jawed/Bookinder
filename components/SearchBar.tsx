"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { Suggestion } from "@/app/api/suggest/route";

type SearchBarProps = {
  initialQuery?: string;
  compact?: boolean;
};

export default function SearchBar({ initialQuery = "", compact = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === initialQuery) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((data: { suggestions?: Suggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setHighlight(-1);
        })
        .catch(() => {});
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, initialQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submitWith = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSuggestions([]);
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (highlight >= 0 && suggestions[highlight]) {
      submitWith(suggestions[highlight].title);
    } else {
      submitWith(query);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Escape") {
      setSuggestions([]);
    }
  };

  const showDropdown = focused && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-full flex items-center ${compact ? "gap-1.5 sm:gap-2" : "gap-2 md:gap-3"}`}
      >
        <div
          className={`flex-1 min-w-0 flex items-center bg-white rounded-full border border-border transition-all duration-300 ${
            focused ? "shadow-glow border-primary" : "shadow-soft hover:-translate-y-0.5"
          } ${compact ? "h-11 sm:h-12 px-3 sm:px-5" : "h-12 sm:h-[60px] px-4 sm:px-6"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-5 h-5 text-accent shrink-0 ${compact ? "mr-2 sm:mr-3" : "mr-3"}`}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search for any book…"
            aria-label="Search for a book"
            autoComplete="off"
            className="flex-1 bg-transparent outline-none text-dark placeholder:text-dark/40 text-sm sm:text-base min-w-0"
          />
        </div>

        <motion.button
          type="submit"
          aria-label="Search"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={`bg-primary text-white rounded-full font-medium hover:bg-dark transition-colors duration-300 shrink-0 inline-flex items-center justify-center ${
            compact
              ? "h-11 sm:h-12 w-11 sm:w-auto sm:px-5 text-sm"
              : "h-12 sm:h-[60px] w-12 sm:w-auto sm:px-7 md:px-8 text-sm sm:text-base"
          }`}
        >
          <span className="hidden sm:inline">Search</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`sm:hidden ${compact ? "w-4 h-4" : "w-5 h-5"}`}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </motion.button>
      </motion.form>

      <AnimatePresence>
        {showDropdown && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-lift overflow-hidden z-20"
          >
            {suggestions.map((s, idx) => (
              <li key={`${s.title}-${idx}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submitWith(s.title)}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    highlight === idx ? "bg-primary/5" : "hover:bg-primary/5"
                  }`}
                >
                  <div className="w-8 h-12 shrink-0 rounded-sm bg-border/40 overflow-hidden flex items-center justify-center">
                    {s.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dark truncate">
                      {s.title}
                    </p>
                    {s.author && (
                      <p className="text-xs text-dark/60 truncate">{s.author}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
