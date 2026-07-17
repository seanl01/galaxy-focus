import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#04060f",
          900: "#070b18",
          800: "#0b1226",
          700: "#131c38",
        },
        glow: {
          gold: "#e5c15c",
          blue: "#7db4ff",
          cyan: "#8fe3ff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.35em",
      },
    },
  },
  plugins: [],
};

export default config;
