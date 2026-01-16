/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          800: '#13131a',
          700: '#1a1a24',
          600: '#24243a',
        },
        neon: {
          purple: '#a855f7',
          pink: '#ec4899',
          cyan: '#06b6d4',
          green: '#10b981',
        },
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'neon-pink': '0 0 20px rgba(236, 72, 153, 0.3)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
    },
  },
  plugins: [],
};
