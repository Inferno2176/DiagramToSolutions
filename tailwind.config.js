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
        // Terra Light Design System Palette
        "surface": "#F8F6F0",
        "surface-dim": "#EAE5DB",
        "surface-bright": "#FAF6F0",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F5F1EA",
        "surface-container": "#F2EFE7",
        "surface-container-high": "#EAE5DB",
        "surface-container-highest": "#E2DCD1",
        "on-surface": "#242820",
        "on-surface-variant": "#73766F",
        "primary": "#397A55",
        "primary-hover": "#2E6345",
        "primary-container": "#397A55",
        "on-primary": "#FFFFFF",
        "primary-fixed": "#E7F0E8",
        "primary-fixed-dim": "#C8E8D0",
        "on-primary-fixed": "#173C27",
        "on-primary-container": "#FFFFFF",
        "secondary": "#6B6358",
        "secondary-container": "#ECE7DC",
        "on-secondary-container": "#4F4A40",
        "on-secondary": "#FFFFFF",
        "secondary-fixed": "#ECE7DC",
        "secondary-fixed-dim": "#D4CCBF",
        "tertiary": "#705C30",
        "tertiary-container": "#F2E5C9",
        "tertiary-fixed": "#FBF0DB",
        "tertiary-fixed-dim": "#DCC48E",
        "on-tertiary": "#FFFFFF",
        "on-tertiary-fixed": "#221A05",
        "on-tertiary-fixed-variant": "#554020",
        "outline": "#E5E1D8",
        "outline-variant": "#DBD6CC",
        "error": "#B83230",
        "error-container": "#FCE8E7",
        "on-error": "#FFFFFF",
        "on-error-container": "#690005",

        // Retain semantic mappings for compatibility
        dark: {
          950: "#FFFFFF",
          900: "#F8F6F0",
          800: "#F2EFE7",
          700: "#EAE5DB",
          600: "#73766F",
        },
        brand: {
          cyan: "#397A55",
          purple: "#705C30",
          indigo: "#397A55",
          emerald: "#397A55",
          pink: "#B83230",
        }
      },
      fontFamily: {
        sans: ["Inter", "Nunito Sans", "sans-serif"],
        headline: ["Geist", "Literata", "Inter", "sans-serif"],
        heading: ["Geist", "Literata", "Inter", "sans-serif"],
        body: ["Inter", "Nunito Sans", "sans-serif"],
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
