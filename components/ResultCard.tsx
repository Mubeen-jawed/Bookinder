"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { BookResult } from "@/lib/google";
import PdfCover from "./PdfCover";

type ResultCardProps = {
  result: BookResult;
  index: number;
};

export default function ResultCard({ result, index }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

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
      className="bg-white border border-border rounded-xl p-4 sm:p-5 shadow-soft hover:shadow-lift transition-shadow duration-300 flex gap-3 sm:gap-4 overflow-hidden"
    >
      <div className="shrink-0 w-20 h-28 sm:w-24 sm:h-36 rounded-md overflow-hidden bg-border/40 flex items-center justify-center">
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

        <div className="mt-3 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
          <motion.a
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-primary text-white text-xs sm:text-sm font-medium h-9 sm:h-10 px-3.5 sm:px-4 rounded-full hover:bg-dark transition-colors duration-300"
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
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-accent text-white text-xs sm:text-sm font-medium h-9 sm:h-10 px-3.5 sm:px-4 rounded-full hover:bg-dark transition-colors duration-300"
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
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 border border-border text-dark/80 text-xs sm:text-sm font-medium h-9 sm:h-10 px-3.5 sm:px-4 rounded-full hover:border-primary hover:text-primary transition-colors duration-300"
          >
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}
