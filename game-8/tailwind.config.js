/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Aether Drift — floating-sky palette
        skyNight:  '#0a1228',
        skyDeep:   '#10204a',
        panelInk:  '#0c1730',
        glassInk:  '#0e1c3a',
        aether:    '#4fe0d8',   // teal aether energy
        aetherHot: '#8af7ff',
        gold:      '#ffcf5a',
        amber:     '#ff9d3c',
        ember:     '#ff5a47',
        leviathan: '#b06bff',
        ruin:      '#c9b690',
        storm:     '#6ea8ff',
        forest:    '#76e08a',
        foundry:   '#ffa052',
        hpGood:    '#76e08a',
        hpBad:     '#ff5a47',
        fuel:      '#ffcf5a',
        ink:       '#dfe9ff',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        glowAether: '0 0 18px rgba(79,224,216,0.5)',
        glowGold:   '0 0 18px rgba(255,207,90,0.5)',
        glowEmber:  '0 0 18px rgba(255,90,71,0.5)',
      },
    },
  },
  plugins: [],
}
