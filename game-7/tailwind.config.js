/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Code Zero — black-matrix cyberpunk with hot neon accents
        voidBlack: '#04060a',
        gridInk:   '#0a0f1a',
        panelInk:  '#0e1626',
        slashRed:  '#ff2b4e',
        neonCyan:  '#1cf2ff',
        neonLime:  '#62ff8a',
        neonAmber: '#ffb020',
        neonViolet:'#a05cff',
        dataBlue:  '#3da8ff',
        hpGood:    '#62ff8a',
        hpBad:     '#ff2b4e',
        stamFull:  '#1cf2ff',
        stamLow:   '#ffb020',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        glowCyan: '0 0 18px rgba(28,242,255,0.5)',
        glowRed:  '0 0 18px rgba(255,43,78,0.5)',
        glowLime: '0 0 18px rgba(98,255,138,0.5)',
      },
    },
  },
  plugins: [],
}
