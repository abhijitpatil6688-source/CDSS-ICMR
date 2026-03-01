/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        icmr: {
          blue: '#003087',
          light: '#0057B8',
          accent: '#E8F0FE',
        },
      },
    },
  },
  plugins: [],
}
