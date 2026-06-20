/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        acme: {
          blue: '#1A56DB',
          'blue-light': '#EFF6FF',
          'blue-mid': '#BFDBFE',
          slate: '#111827',
          amber: '#F59E0B',
          'amber-light': '#FFFBEB',
          gray: '#F9FAFB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
