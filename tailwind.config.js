/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: '#00ffff',
        neonpink: '#ff007f',
        darkbg: '#05030a',
        cardbg: '#110b2a'
      },
      boxShadow: {
        neon: '0 0 15px rgba(0, 255, 255, 0.4)',
        neonpink: '0 0 15px rgba(255, 0, 127, 0.4)',
        gold: '0 0 15px rgba(255, 215, 0, 0.5)'
      }
    },
  },
  plugins: [],
}
