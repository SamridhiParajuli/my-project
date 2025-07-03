/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFDF5',
          100: '#F8F4E4',
          200: '#F5F0D6',
          300: '#EFE8C2',
        },
        dark: {
          600: '#2F2F2F',
          700: '#242424',
          800: '#1A1A1A',
          900: '#121212',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F0E29C',
        },
        accent: {
          green: '#2E7D32',
          red: '#C62828',
          blue: '#1565C0',
        },
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}