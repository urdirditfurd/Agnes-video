/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#0a0e12",
          raised: "#111820",
          overlay: "#172029",
        },
        ink: {
          DEFAULT: "#e7eef6",
          muted: "#8b9bb0",
          faint: "#5c6b7e",
        },
        accent: {
          DEFAULT: "#2dd4bf",
          dim: "#0f766e",
        },
        danger: {
          DEFAULT: "#f07178",
          dim: "#7f1d1d",
        },
        warn: {
          DEFAULT: "#e6b450",
        },
        line: "#1e2a36",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(45, 212, 191, 0.08)",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.85)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scan: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
        riseIn: "riseIn 0.55s ease-out both",
        scan: "scan 8s linear infinite",
      },
    },
  },
  plugins: [],
};
