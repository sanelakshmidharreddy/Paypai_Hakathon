/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paypal: {
          blue: '#003087',
          lightBlue: '#0070BA',
          marine: '#001C38',
          yellow: '#FFC439',
          gold: '#F6B400',
        },
      },
    },
  },
  plugins: [],
}

