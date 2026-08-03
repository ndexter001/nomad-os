/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './trip.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#12141c',
          raised: '#1a1e29',
          border: 'rgba(255,255,255,0.08)'
        },
        accent: {
          DEFAULT: '#818cf8',
          dim: 'rgba(129, 140, 248, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
