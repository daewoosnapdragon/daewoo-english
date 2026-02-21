import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F5F3EF',
        surface: '#FFFFFF',
        'surface-alt': '#EFEDE7',
        border: '#E0DDD6',
        'border-focus': '#003F66',
        'text-primary': '#1A1A2E',
        'text-secondary': '#5A5A6E',
        'text-tertiary': '#8A8A9A',
        // School palette
        navy: '#003F66',
        'navy-dark': '#002A45',
        'navy-deep': '#011B2F',
        gold: '#FFB915',
        'gold-light': '#FFD358',
        'gold-pale': '#FFF8E7',
        // Semantic
        accent: '#003F66',
        'accent-light': '#E8F2F8',
        'accent-hover': '#002A45',
        warm: '#FFB915',
        'warm-light': '#FFF8E7',
        danger: '#DC2626',
        'danger-light': '#FEF2F2',
        success: '#059669',
        'success-light': '#ECFDF5',
        // Class level colors
        'level-lily': '#F3C4C8',
        'level-camellia': '#F5D0A9',
        'level-daisy': '#F9E79F',
        'level-sunflower': '#ABEBC6',
        'level-marigold': '#AED6F1',
        'level-snapdragon': '#D2B4DE',
      },
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body: ['Roboto', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,63,102,0.06)',
        'md': '0 4px 12px rgba(0,63,102,0.08)',
        'lg': '0 8px 30px rgba(0,63,102,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
