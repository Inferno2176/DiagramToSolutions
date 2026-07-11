/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#05070c",
          900: "#0B0F19", // Deep space dark blue-slate
          800: "#151B2B", // Dark card base
          700: "#222C43", // Borders & highlights
          600: "#374766",
        },
        brand: {
          cyan: "#06B6D4",   // Vibrant cyan
          purple: "#A855F7", // Electric purple
          indigo: "#6366F1", // Deep indigo
          emerald: "#10B981", // Success emerald
          pink: "#EC4899",   // Highlight pink
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Outfit", "sans-serif"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
