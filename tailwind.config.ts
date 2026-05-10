import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          900: "#0A1128", // Deep navy/black
          800: "#121C3A", // Slightly lighter navy
          700: "#1E2A50",
        },
        profit: {
          DEFAULT: "#10B981", // Emerald green
          light: "#34D399",
          dark: "#059669",
        },
        loss: {
          DEFAULT: "#EF4444", // Soft red
          light: "#F87171",
          dark: "#DC2626",
        },
        gold: {
          DEFAULT: "#F59E0B", // Premium gold
          light: "#FCD34D",
          dark: "#D97706",
        },
        slate: {
          800: "#1E293B",
          900: "#0F172A",
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass': 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
