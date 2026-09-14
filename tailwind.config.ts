import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sg: {
          black: '#000000',
          bg: '#0a0a0a',
          surface: '#111111',
          'surface-2': '#1a1a1a',
          'surface-3': '#222222',
          border: 'rgba(255, 255, 255, 0.06)',
          'border-2': 'rgba(255, 255, 255, 0.1)',
          'text-primary': '#ffffff',
          'text-secondary': '#a1a1aa',
          'text-muted': '#71717a',
          purple: '#8b5cf6',
          'purple-dark': '#7c3aed',
          'purple-light': '#a78bfa',
          'purple-glow': 'rgba(139, 92, 246, 0.15)',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
          'bubble-out': '#8b5cf6',
          'bubble-in': '#1a1a1a',
          'deleted': 'rgba(239, 68, 68, 0.08)',
          'deleted-border': 'rgba(239, 68, 68, 0.2)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        'bubble': '18px',
        'bubble-tail': '4px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};

export default config;
