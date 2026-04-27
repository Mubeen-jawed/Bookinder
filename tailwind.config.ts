import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F5F0",
        primary: "#6B4F3A",
        dark: "#2B2B2B",
        accent: "#A67C52",
        border: "#E5DED6",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(43, 43, 43, 0.06)",
        lift: "0 10px 30px rgba(43, 43, 43, 0.10)",
        glow: "0 0 0 3px rgba(107, 79, 58, 0.18)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "fade-in": "fade-in 0.5s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
