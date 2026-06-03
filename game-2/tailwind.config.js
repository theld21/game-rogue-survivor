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
        orbitCyan: '#00f0ff',
        orbitPink: '#ff007f',
        orbitPurple: '#d946ef',
        orbitYellow: '#fbbf24',
        orbitRed: '#ef4444',
        orbitGreen: '#22c55e',
        orbitDark: '#080512',
      },
      boxShadow: {
        neonCyan: '0 0 15px rgba(0, 240, 255, 0.4)',
        neonPink: '0 0 15px rgba(255, 0, 127, 0.4)',
        neonPurple: '0 0 15px rgba(217, 70, 239, 0.4)',
        neonYellow: '0 0 15px rgba(251, 191, 36, 0.4)',
      }
    },
  },
  plugins: [daisyui],
}
