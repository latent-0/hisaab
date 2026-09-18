import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paytm-flavoured: navy primary (#002970) with cyan (#00BAF2) at the
        // light end for accents that pop on dark surfaces.
        brand: {
          50: "#e6f4fd",
          100: "#cfe9fb",
          200: "#a6d8f7",
          300: "#4fb9ef",
          400: "#14a4e8",
          500: "#0a63b0",
          600: "#002970",
          700: "#001f57",
          800: "#001a49",
          900: "#00133a",
          950: "#000b24",
        },
        // Paytm cyan accent, available as `accent-*`.
        accent: {
          DEFAULT: "#00BAF2",
          soft: "#e6f7fe",
           600: "#009fe0",
        },
        ink: {
          DEFAULT: "#0b1120",
          soft: "#1e293b",
          muted: "#64748b",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f6f8fc",
          border: "#e5e9f2",
        },
        success: "#0f9d58",
        warning: "#e8a11a",
        danger: "#e0433c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)",
        pop: "0 12px 40px rgba(16,24,40,0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-ring": "pulseRing 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
