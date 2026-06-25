/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a1a2e',
        accent: '#c8a96e',
        accent2: '#f5eedc',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      }
    }
  },
  plugins: [],
}
