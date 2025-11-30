/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clean dark theme
        success: '#10b981',   
        danger: '#ef4444',    
        warning: '#f59e0b',   
        gold: '#fbbf24',
        primary: {
          100: '#e0f2ff',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
