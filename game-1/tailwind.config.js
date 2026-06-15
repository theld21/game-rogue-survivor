/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sunset-neon palette (đồng bộ game-6)
        cyber: '#22e3ff',
        neonpink: '#ff4fa3',
        darkbg: '#140a2e',
        cardbg: '#1d1442',
        skyTop: '#2a1a5e',
        skyMid: '#7b3fa0',
        skyLow: '#ff7e5f',
        duskGlow: '#feb47b',
        nightInk: '#140a2e',
        panelInk: '#1d1442',
        neonCyan: '#22e3ff',
        neonPink: '#ff4fa3',
        neonLime: '#9dff5c',
        neonYellow: '#ffd83d',
        neonOrange: '#ff8a3d',
        neonViolet: '#9d6bff'
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Baloo 2', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 18px rgba(34, 227, 255, 0.4)',
        neonpink: '0 0 18px rgba(255, 79, 163, 0.4)',
        gold: '0 0 18px rgba(255, 216, 61, 0.5)'
      }
    },
  },
  plugins: [],
}
