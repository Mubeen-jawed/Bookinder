"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { BookResult } from "@/lib/google";
import PdfCover from "./PdfCover";

function isDirectPdfLink(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return /\.pdf(?:$|[?#])/i.test(pathname);
  } catch {
    return /\.pdf(?:$|[?#])/i.test(url);
  }
}

type ResultCardProps = {
  result: BookResult;
  index: number;
};

export default function ResultCard({ result, index }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [showPdfPrompt, setShowPdfPrompt] = useState(false);

  const openIsDirectPdf =
    isDirectPdfLink(result.link) ||
    (result.pdfUrl != null && result.pdfUrl === result.link);

  const handleOpenClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!openIsDirectPdf) return;
    event.preventDefault();
    setShowPdfPrompt(true);
  };

  useEffect(() => {
    if (!showPdfPrompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPdfPrompt(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showPdfPrompt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const showCover = result.coverUrl && !coverFailed;
  const showPdfFallback = !showCover && Boolean(result.pdfUrl);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="w-full max-w-full min-w-0 bg-white border border-border rounded-xl p-3 sm:p-5 shadow-soft hover:shadow-lift transition-shadow duration-300 flex gap-3 sm:gap-4 overflow-hidden"
    >
      <div className="shrink-0 w-16 h-24 sm:w-24 sm:h-36 rounded-md overflow-hidden bg-border/40 flex items-center justify-center">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.coverUrl as string}
            alt={`${stripHtml(result.title)} cover`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : showPdfFallback ? (
          <PdfCover
            pdfUrl={result.pdfUrl as string}
            alt={`${stripHtml(result.title)} first page`}
          />
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-dark/40 px-2 text-center">
            No cover
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-serif text-base sm:text-lg md:text-xl font-bold text-dark leading-snug line-clamp-2 break-anywhere">
          {stripHtml(result.title)}
        </h3>

        <p className="mt-1 text-[10px] sm:text-xs uppercase tracking-wide text-accent truncate">
          {result.domain}
        </p>

        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-dark/70 line-clamp-2 break-anywhere">
          {stripHtml(result.snippet)}
        </p>

        <div className="mt-3 sm:mt-5 flex flex-wrap items-center gap-1.5 sm:gap-3 min-w-0">
          <motion.a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-primary text-white text-xs sm:text-sm font-medium h-9 sm:h-10 px-3 sm:px-4 rounded-full hover:bg-dark transition-colors duration-300"
          >
            Open PDF
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </motion.a>

          {result.pdfUrl && (
            <motion.a
              href={result.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-accent text-white text-xs sm:text-sm font-medium h-9 sm:h-10 px-3 sm:px-4 rounded-full hover:bg-dark transition-colors duration-300"
            >
              Download
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m6 11 6 6 6-6" />
                <path d="M5 21h14" />
              </svg>
            </motion.a>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 border border-border text-dark/80 text-xs sm:text-sm font-medium h-9 sm:h-10 px-3 sm:px-4 rounded-full hover:border-primary hover:text-primary transition-colors duration-300"
          >
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPdfPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-dark/40 backdrop-blur-sm"
            onClick={() => setShowPdfPrompt(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`pdf-prompt-title-${index}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-2xl shadow-lift p-6"
            >
              <h2
                id={`pdf-prompt-title-${index}`}
                className="font-serif text-lg sm:text-xl text-dark"
              >
                Heads up — this is a direct PDF link
              </h2>
              <p className="mt-2 text-sm text-dark/70">
                Opening this link will start downloading the PDF in your
                browser. Continue?
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPdfPrompt(false)}
                  className="inline-flex items-center justify-center border border-border text-dark/80 text-sm font-medium h-10 px-4 rounded-full hover:border-primary hover:text-primary transition-colors duration-300"
                >
                  Cancel
                </button>
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowPdfPrompt(false)}
                  className="inline-flex items-center justify-center bg-primary text-white text-sm font-medium h-10 px-4 rounded-full hover:bg-dark transition-colors duration-300"
                >
                  Continue
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}
