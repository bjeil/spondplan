/** @type {import('tailwindcss').Config} */

// Farger som CSS-variabler (definert i src/index.css) slik at lyst/mørkt tema
// kan byttes uten å endre komponenter. <alpha-value> lar oss bruke /opacity.
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        viking: {
          blue: '#132436',
          'blue-light': '#1d3a54',
          'blue-deep': '#0c1826',
          gold: '#DBC067',
          red: '#72121C',
          white: '#FFFFFF'
        },
        app: {
          bg: withAlpha('--app-bg'),
          surface: withAlpha('--app-surface'),
          'surface-deep': withAlpha('--app-surface-deep'),
          'surface-2': withAlpha('--app-surface-2'),
          text: withAlpha('--app-text'),
          border: withAlpha('--app-border'),
          hover: withAlpha('--app-hover'),
          gold: withAlpha('--app-gold')
        }
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Arial Black', 'sans-serif'],
        body: ['Montserrat', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
