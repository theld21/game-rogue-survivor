/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk / deep-space palette
        voidBlack:  '#05060f',
        voidDeep:   '#0a0e1f',
        nebula:     '#1a1040',
        cyberCyan:  '#00f0ff',
        cyberPink:  '#ff2db4',
        cyberPurple:'#9d4dff',
        cyberLime:  '#aaff00',
        cosmicGold: '#ffc83d',
        plasmaBlue: '#3d9bff',
        iceGlow:    '#7fd4ff',
        magmaRed:   '#ff5a2d',
        hullGreen:  '#3dffa0',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        glowCyan:   '0 0 20px rgba(0, 240, 255, 0.5)',
        glowPink:   '0 0 20px rgba(255, 45, 180, 0.5)',
        glowGold:   '0 0 20px rgba(255, 200, 61, 0.5)',
        glowPurple: '0 0 20px rgba(157, 77, 255, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
