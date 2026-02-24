/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  safelist: [
    { pattern: /bg-(blue|green|purple|amber|violet|pink|red|teal|orange|indigo|emerald)-(50|100|500)/ },
    { pattern: /text-(blue|green|purple|amber|violet|pink|red|teal|orange|indigo|emerald)-(400|500|600|700|800)/ },
    { pattern: /border-(blue|green|purple|amber|violet|pink|red|teal|orange|indigo|emerald)-(200|300)/ },
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          50: '#fef7f0',
          100: '#fdecd8',
          200: '#fad5b0',
          300: '#f5b77d',
          400: '#ef8f48',
          500: '#e8734a',
          600: '#d4622b',
          700: '#b04b23',
          800: '#8d3d22',
          900: '#73341e',
          950: '#3e180e',
        },
        sand: {
          50: '#faf8f5',
          100: '#f2ede6',
          200: '#e8e0d4',
          300: '#d8ccb8',
          400: '#c4b196',
          500: '#b5997c',
          600: '#a8876b',
          700: '#8c6f59',
          800: '#735c4c',
          900: '#5f4d40',
        }
      }
    },
  },
  plugins: [],
};
