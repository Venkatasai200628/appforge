export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#6366f1', dark: '#4f46e5', light: '#818cf8', muted: '#6366f115' },
        surface: {
          DEFAULT: '#0f172a', card: '#1e293b', border: '#334155',
          hover: '#1e293b', muted: '#334155',
        },
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
      },
    }
  },
  plugins: []
}
