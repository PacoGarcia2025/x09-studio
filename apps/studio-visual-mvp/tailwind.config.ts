import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        surface: "var(--bg-secondary)",
        foreground: "var(--text-primary)",
        muted: "var(--text-secondary)",
        accent: {
          DEFAULT: "var(--accent-primary)",
          hover: "var(--accent-hover)",
        },
        border: "var(--border-color)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 36px rgba(122, 60, 255, 0.34)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
