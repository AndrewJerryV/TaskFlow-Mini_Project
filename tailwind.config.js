/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // We are adding "./*" to catch files if they are not in src
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#81c773',
          greenLight: '#86c969',
          blue: '#1775d4',
          teal: '#32887a',
          dark: '#0f172a',
        },
        accent: {
          purple: '#6c3cfc',
          green: '#00b894',
          pink: '#e84393',
          blue: '#0984e3',
          purpleLight: 'rgba(108, 60, 252, 0.08)',
          greenLight: 'rgba(0, 184, 148, 0.08)',
          pinkLight: 'rgba(232, 67, 147, 0.08)',
          blueLight: 'rgba(9, 132, 227, 0.08)',
        }
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(108,60,252,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(108,60,252,0.03) 1px, transparent 1px)',
      },
      fontFamily: {
        poppins: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
};