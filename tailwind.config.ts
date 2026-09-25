import type { Config } from 'tailwindcss'

// Every colour reads a token from globals.css, so light and dark are defined
// once, there. `<alpha-value>` keeps opacity modifiers (bg-accent/15) working.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: v('paper'),
        paper: v('paper'),
        'paper-2': v('paper-2'),
        'paper-3': v('paper-3'),
        surface: v('white'),
        'surface-alt': v('paper-2'),
        white: v('white'),
        border: v('rule'),
        rule: v('rule'),
        'rule-2': v('rule-2'),
        'border-focus': v('accent'),
        // Ink
        ink: v('ink'),
        'ink-2': v('ink-2'),
        'ink-3': v('ink-3'),
        'text-primary': v('ink'),
        'text-secondary': v('ink-2'),
        'text-tertiary': v('ink-3'),
        // Legacy brand names, remapped: headings and primary buttons that were
        // navy are ink; anything gold is the one accent.
        navy: v('ink'),
        'navy-dark': v('ink-block'),
        'navy-deep': v('ink-block'),
        gold: v('accent'),
        'gold-light': v('accent-2'),
        'gold-pale': v('accent-soft'),
        accent: v('accent'),
        'accent-light': v('accent-soft'),
        'accent-hover': v('accent-2'),
        warm: v('accent'),
        'warm-light': v('accent-soft'),
        // Status: reserved for meaning
        danger: v('bad'),
        'danger-light': v('bad-soft'),
        success: v('good'),
        'success-light': v('good-soft'),
        good: v('good'), 'good-soft': v('good-soft'),
        warn: v('warn'), 'warn-soft': v('warn-soft'),
        bad: v('bad'), 'bad-soft': v('bad-soft'),
        info: v('info'), 'info-soft': v('info-soft'),
        // Class identity
        'level-lily': v('lily'),
        'level-camellia': v('camellia'),
        'level-daisy': v('daisy'),
        'level-sunflower': v('sunflower'),
        'level-marigold': v('marigold'),
        'level-snapdragon': v('snapdragon'),
      },
      fontFamily: {
        display: ['var(--font-serif)', 'Iowan Old Style', 'Georgia', 'serif'],
        serif: ['var(--font-serif)', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'var(--font-kr)', 'system-ui', 'sans-serif'],
        body: ['var(--font-sans)', 'var(--font-kr)', 'system-ui', 'sans-serif'],
      },
      // Flatter corners everywhere; older screens' rounded-xl becomes a quiet 5px.
      borderRadius: {
        DEFAULT: '3px', sm: '2px', md: '3px', lg: '4px', xl: '5px', '2xl': '6px', '3xl': '8px',
      },
      // Hairlines instead of shadows. The neu-* names stay for older screens.
      boxShadow: {
        sm: '0 1px 0 rgb(var(--rule))',
        DEFAULT: '0 0 0 1px rgb(var(--rule))',
        md: '0 0 0 1px rgb(var(--rule))',
        lg: '0 0 0 1px rgb(var(--rule-2)), 0 8px 24px rgb(var(--ink) / 0.08)',
        xl: '0 0 0 1px rgb(var(--rule-2)), 0 12px 32px rgb(var(--ink) / 0.10)',
        '2xl': '0 0 0 1px rgb(var(--rule-2)), 0 16px 40px rgb(var(--ink) / 0.12)',
        'neu-raised': '0 0 0 1px rgb(var(--rule))',
        'neu-inset': 'inset 0 0 0 1px rgb(var(--rule))',
        'neu-btn': '0 0 0 1px rgb(var(--rule))',
        'neu-flat': '0 0 0 1px rgb(var(--rule))',
      },
    },
  },
  plugins: [],
}

export default config
