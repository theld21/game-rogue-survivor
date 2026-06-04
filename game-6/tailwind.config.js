/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Bright sunset-neon city palette (cheerful, not dark cyberpunk)
        skyTop:    '#2a1a5e',
        skyMid:    '#7b3fa0',
        skyLow:    '#ff7e5f',
        duskGlow:  '#feb47b',
        nightInk:  '#140a2e',
        panelInk:  '#1d1442',
        neonCyan:  '#22e3ff',
        neonPink:  '#ff4fa3',
        neonLime:  '#9dff5c',
        neonYellow:'#ffd83d',
        neonOrange:'#ff8a3d',
        neonViolet:'#9d6bff',
        hullGood:  '#4dffa0',
        hullWarn:  '#ffd83d',
        hullBad:   '#ff5470',
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Baloo 2', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        glowCyan: '0 0 18px rgba(34,227,255,0.5)',
        glowPink: '0 0 18px rgba(255,79,163,0.5)',
        glowLime: '0 0 18px rgba(157,255,92,0.5)',
      },
    },
  },
  plugins: [],
}
