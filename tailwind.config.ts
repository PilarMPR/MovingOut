import type { Config } from 'tailwindcss';

/**
 * Tailwind consumes the CSS custom properties from src/styles/tokens.css.
 * It owns no colour of its own — swapping the palette stays a nine-line edit
 * in one :root block, not a sweep across components (DESIGN-SYSTEM.md §2).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        sunk: 'var(--sunk)',
        raised: 'var(--raised)',
        ink: 'var(--ink)',
        accent: 'var(--accent)',
        green: 'var(--green)',
        red: 'var(--red)',
        amber: 'var(--amber)',
        stone: 'var(--stone)',
      },
      fontFamily: {
        display: 'var(--display)',
        mono: 'var(--mono)',
        body: 'var(--body)',
      },
    },
  },
  plugins: [],
} satisfies Config;
