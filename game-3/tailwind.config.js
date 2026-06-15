import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        grotesk: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        stellarBlue: '#00AAFF',
        stellarRed: '#FF3355',
        stellarPurple: '#8855FF',
        stellarGold: '#FFAA00',
        stellarGreen: '#00FF88',
        stellarDark: '#030008',
      },
      boxShadow: {
        neonBlue:   '0 0 16px rgba(0, 170, 255, 0.5)',
        neonRed:    '0 0 16px rgba(255, 51, 85, 0.5)',
        neonPurple: '0 0 16px rgba(136, 85, 255, 0.5)',
        neonGold:   '0 0 16px rgba(255, 170, 0, 0.5)',
      }
    },
  },
  plugins: [daisyui],
};
