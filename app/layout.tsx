import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bookinder — Find Any Book PDF Instantly",
  description:
    "Bookinder helps you find publicly available PDF versions of books in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F8F5F0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-background text-dark min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t border-border bg-background/80">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-dark/60">
            <p>
              Built with care.{" "}
              <span className="text-dark/40">
                Bookinder indexes publicly available PDFs.
              </span>
            </p>
            <a
              href="https://github.com/Mubeen-jawed/Bookinder"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border bg-white text-dark/80 hover:text-primary hover:border-primary rounded-full px-3.5 py-1.5 transition-colors duration-300 shadow-soft"
              aria-label="Star Bookinder on GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.18.08 1.8 1.21 1.8 1.21 1.04 1.79 2.74 1.27 3.41.97.1-.76.4-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.49.11-3.1 0 0 .98-.31 3.2 1.18a11.07 11.07 0 0 1 5.83 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.61.23 2.8.11 3.1.75.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
              </svg>
              <span className="font-medium">Star on GitHub</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5 text-accent"
                aria-hidden="true"
              >
                <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
