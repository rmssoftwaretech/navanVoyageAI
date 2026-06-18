import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1E3A5F',
        'navy-dark': '#162D4A',
        'navy-light': '#2A4F7F',
        gold: '#D97706',
        'gold-light': '#F59E0B',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
