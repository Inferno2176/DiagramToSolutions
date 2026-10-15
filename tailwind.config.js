/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Glacier Stitch Palette
        "surface": "#0b0f19",
        "surface-dim": "#0b0f19",
        "surface-bright": "#1a2438",
        "surface-container-lowest": "#070b13",
        "surface-container-low": "#101626",
        "surface-container": "#141c2e",
        "surface-container-high": "#1a2438",
        "surface-container-highest": "#202c42",
        "on-surface": "#e0e8f0",
        "on-surface-variant": "#8ea5b8",
        "primary": "#38bdf8",
        "primary-hover": "#0ea5e9",
        "primary-container": "#0e4d6e",
        "on-primary": "#001f2e",
        "primary-fixed": "#c8eaff",
        "primary-fixed-dim": "#7dd3fc",
        "secondary": "#88b4cc",
        "secondary-container": "#15263a",
        "on-secondary": "#001f2e",
        "tertiary": "#c8a0f0",
        "tertiary-container": "#3d2060",
        "on-tertiary": "#1a002e",
        "outline": "#334b63",
        "outline-variant": "#223347",
        "error": "#ff6b6b",
        "error-container": "#3d1414",
        "on-error": "#1a0000",
        
        // Retain existing tokens for backward compatibility
        dark: {
          950: "#070b13",
          900: "#0b0f19",
          800: "#141c2e",
          700: "#202c42",
          600: "#334b63",
        },
        brand: {
          cyan: "#38bdf8",
          purple: "#c8a0f0",
          indigo: "#6366f1",
          emerald: "#10b981",
          pink: "#ec4899",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        headline: ["Geist", "Inter", "sans-serif"],
        heading: ["Geist", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        label: ["JetBrains Mono", "Inter", "sans-serif"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
