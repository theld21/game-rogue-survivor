/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss:    '#01080f',
        deep:     '#041d30',
        sonar:    '#46e8ff',
        sonarHot: '#aaf6ff',
        light:    '#ffe9a8',
        warn:     '#ffc24a',
        danger:   '#ff4a5a',
        crystal:  '#57f0d0',
        salvage:  '#c9a86e',
        pearl:    '#fff0f6',
        ore:      '#9fb4c8',
        biosample:'#9affa0',
        vent:     '#ff7a3c',
        ink:      '#cfe2f2',
        hpGood:   '#76e08a',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
