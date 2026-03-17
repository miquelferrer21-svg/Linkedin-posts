import typography from '@tailwindcss/typography'
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'finomik-blue': '#0B3064',
        'finomik-blue-mid': '#114076',
        'finomik-blue-light': '#5574A7',
        'finomik-gray': '#8F9EB7',
        'finomik-gray-light': '#C8D0DD',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
} satisfies Config
