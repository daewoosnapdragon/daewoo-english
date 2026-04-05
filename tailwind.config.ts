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
        bg: '#E8ECF1',
        surface: '#FFFFFF',
        'surface-alt': '#DFE4EB',
        border: '#C8CED8',
        'border-focus': '#647FBC',
        'text-primary': '#1A1F2E',
        'text-secondary': '#5A6275',
        'text-tertiary': '#8892A2',
        // Brand palette
        navy: '#647FBC',
        'navy-dark': '#4A6199',
        'navy-deep': '#354A7C',
        gold: '#E8C547',
        'gold-light': '#F0D76A',
        'gold-pale': '#FAFDD6',
        // Semantic
        accent: '#647FBC',
        'accent-light': '#EDF1F8',
        'accent-hover': '#4A6199',
        warm: '#E8C547',
        'warm-light': '#FAFDD6',
        danger: '#DC2626',
        'danger-light': '#FEF2F2',
        success: '#059669',
        'success-light': '#ECFDF5',
        // Class level colors (palette-derived, mutually distinct)
        'level-lily': '#D4A5B0',
        'level-camellia': '#C8A88E',
        'level-daisy': '#E8DFA0',
        'level-sunflower': '#AED6CF',
        'level-marigold': '#91ADC8',
        'level-snapdragon': '#B4A8CC',
      },
      fontFamily: {
        display: ['var(--font-inter)', 'Inter', '-apple-system', 'sans-serif'],
        body: ['var(--font-inter)', 'Inter', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(100,127,188,0.06)',
        'md': '0 4px 12px rgba(100,127,188,0.08)',
        'lg': '0 8px 30px rgba(100,127,188,0.12)',
        // Neumorphic shadows
        'neu-raised': '6px 6px 12px rgba(163,174,191,0.4), -6px -6px 12px rgba(255,255,255,0.7)',
        'neu-inset': 'inset 3px 3px 6px rgba(163,174,191,0.3), inset -3px -3px 6px rgba(255,255,255,0.6)',
        'neu-btn': '3px 3px 6px rgba(163,174,191,0.35), -3px -3px 6px rgba(255,255,255,0.6)',
        'neu-flat': '0 1px 3px rgba(100,127,188,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
