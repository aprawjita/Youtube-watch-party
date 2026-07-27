/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        panel: 'rgba(25, 25, 25, 0.80)',
        primary: '#BB86FC',
      }
    },
  },
  plugins: [],
}