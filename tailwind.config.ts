import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f6f4",
          100: "#eceae6",
          200: "#d8d4cc",
          300: "#b8b2a6",
          400: "#928b7d",
          500: "#756e62",
          600: "#5c564c",
          700: "#4a463f",
          800: "#3d3a35",
          900: "#1c1b19",
          950: "#0c0c0b",
        },
        sand: {
          50: "#fbf8f2",
          100: "#f5efe3",
          200: "#eae0cc",
          300: "#dccdb0",
        },
        gold: {
          300: "#e0c56a",
          400: "#d4af37",
          500: "#c9a227",
          600: "#a8841c",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-vazirmatn)",
          "Tahoma",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-vazirmatn)",
          "Tahoma",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 20px 60px -30px rgba(0,0,0,0.45)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px -28px rgba(0,0,0,0.55)",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201,162,39,0.14), transparent 55%)",
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
    },
  },
  plugins: [],
};

export default config;
