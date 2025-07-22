// Path: tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Luxury color palette based on black and cream theme
        primary: {
          DEFAULT: "#1A1A1A", // Rich black
          light: "#333333",
          dark: "#000000",
        },
        secondary: {
          DEFAULT: "#F5F0E3", // Cream
          light: "#FDF8ED",
          dark: "#E8DFC7",
        },
        accent: {
          DEFAULT: "#B8A87E", // Gold/Bronze
          light: "#D6C9A0",
          dark: "#9A8B60",
        },
        success: "#2D5F3D", // Deep forest green
        warning: "#AD7D2C", // Amber gold
        error: "#872C31", // Deep burgundy
        info: "#2C5F7A", // Deep teal
        surface: {
          DEFAULT: "#FCFAF5", // Off-white
          dark: "#121212", // Near black
        },
        // Keep any existing color definitions your app might be using
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)", 
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        'elegant': '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
        'elegant-lg': '0 10px 30px -3px rgba(0, 0, 0, 0.1)',
        'inner-elegant': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}