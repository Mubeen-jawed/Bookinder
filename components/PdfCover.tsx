"use client";

import { useEffect, useRef, useState } from "react";

type PdfCoverProps = {
  pdfUrl: string;
  alt: string;
  onUnavailable?: () => void;
};

export default function PdfCover({ pdfUrl, alt, onUnavailable }: PdfCoverProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        setStarted(true);
        renderFirstPage(pdfUrl).then(
          (dataUrl) => {
            if (dataUrl) setImgSrc(dataUrl);
            else {
              setFailed(true);
              onUnavailable?.();
            }
          },
          () => {
            setFailed(true);
            onUnavailable?.();
          }
        );
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [pdfUrl, started, onUnavailable]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : failed ? (
        <span className="text-[10px] uppercase tracking-wide text-dark/40 px-2 text-center">
          No cover
        </span>
      ) : (
        <span className="text-[10px] uppercase tracking-wide text-dark/30 px-2 text-center">
          Loading…
        </span>
      )}
    </div>
  );
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.mjs`;
      return mod;
    });
  }
  return pdfjsPromise;
}

async function renderFirstPage(url: string): Promise<string | null> {
  try {
    const pdfjs = await loadPdfjs();
    const loadingTask = pdfjs.getDocument({
      url,
      disableRange: false,
      disableStream: false,
    });
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    const targetWidth = 192;
    const scale = targetWidth / viewport.width;
    const scaled = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport: scaled }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    doc.destroy();
    return dataUrl;
  } catch {
    return null;
  }
}
