/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#000000',
          surface: '#0a0a0a',
          border: '#2a2a2a',
          'border-hover': '#4a3a4a',
          fg: '#e0a0b0',
          dim: '#8a5565',
          muted: '#5a3a42',
          glow: '#e0a0b0',
          lilac: '#c4a0d4',
          'lilac-dim': '#8a6a9a',
          'lilac-muted': '#5a3a6a',
        },
        // Keep for backwards compat
        sand: { 50: '#0a0a0a', 100: '#111', 200: '#2a2a2a', 300: '#3a3a3a', 400: '#8a5565', 500: '#6a4a52' },
        vault: { 50: '#1a0a12', 100: '#2a1a22', 200: '#4a3a42', 300: '#6a4a52', 400: '#8a5a6a', 500: '#e0a0b0', 600: '#c8899a', 700: '#a06878', 800: '#704050', 900: '#3a2028', 950: '#1a0a10' },
        kawaii: { 400: '#e0a0b0', 500: '#c8899a' },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Courier New'", 'monospace'],
      },
    },
  },
  plugins: [],
};
