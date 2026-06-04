import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        seaCyan: '#22d3ee',
        seaTeal: '#2dd4bf',
        seaGold: '#fbbf24',
        seaCrimson: '#fb1d5a',
        seaPurple: '#a855f7',
        seaGreen: '#4ade80',
        seaDeep: '#020a14',
        seaAbyss: '#01060f',
      },
      fontFamily: {
        pirate: ['"Pirata One"', 'cursive'],
        display: ['Orbitron', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        neonCyan: '0 0 15px rgba(34, 211, 238, 0.45)',
        neonGold: '0 0 15px rgba(251, 191, 36, 0.45)',
        neonCrimson: '0 0 15px rgba(251, 29, 90, 0.45)',
        neonTeal: '0 0 15px rgba(45, 212, 191, 0.45)',
      }
    },
  },
  plugins: [daisyui],
}
