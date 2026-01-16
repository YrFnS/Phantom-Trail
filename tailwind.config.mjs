/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Phantom Trail System
        void: '#050A0E',        // Background - "Dark Web" canvas
        plasma: '#BC13FE',      // Primary - Ghost Plasma (user node)
        tracker: '#00F0FF',     // Secondary - Tracker Cyan (data streams)
        expose: '#FF2A6D',      // Alert - High risk
        hud: '#161B22',         // Surface - HUD/narrative box
        terminal: '#E6EDF3',    // Text - Terminal white
        
        // Legacy support (mapped to new system)
        dark: {
          900: '#050A0E',       // Void Black
          800: '#161B22',       // HUD Grey
          700: '#1a1f2e',
          600: '#252b3d',
        },
        primary: {
          500: '#BC13FE',       // Ghost Plasma
          600: '#9a0fd1',       // Darker plasma
        },
        accent: {
          cyan: '#00F0FF',      // Tracker Cyan
          ghost: '#BC13FE',     // Ghost Plasma
        },
        risk: {
          safe: '#10b981',      // Green
          low: '#84cc16',       // Lime
          medium: '#f59e0b',    // Amber
          high: '#FF2A6D',      // Expose Red
          critical: '#FF2A6D',  // Expose Red
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
        'glow-purple-lg': '0 0 30px rgba(139, 92, 246, 0.6)',
        'neon-purple': '0 0 15px rgba(139, 92, 246, 0.5), inset 0 0 15px rgba(139, 92, 246, 0.1)',
      },
    },
  },
  plugins: [],
};
