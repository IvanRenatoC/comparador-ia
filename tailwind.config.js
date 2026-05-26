/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Mono', 'monospace'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        bg: {
          base: '#080b14',
          surface: '#0d1220',
          card: '#111827',
          elevated: '#1a2235',
        },
        accent: {
          cyan: '#00d4ff',
          blue: '#3b82f6',
          violet: '#8b5cf6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
        border: {
          dim: '#1e2d45',
          bright: '#2d4060',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#f5f6f7',
          muted: '#f5f6f7',
          accent: '#00d4ff',
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
