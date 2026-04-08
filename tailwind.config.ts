import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#EAE7DC',
        sand: '#D8C3A5',
        stone: '#8E8D8A',
        terra: '#E98074',
        dark: '#1A1A1A',
        'off-white': '#FAFAFA',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        checkmark: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        pulse: 'pulse 0.4s ease-in-out',
        shimmer: 'shimmer 1.8s linear infinite',
        checkmark: 'checkmark 0.5s ease-in-out 0.2s forwards',
      },
      boxShadow: {
        card: '0 4px 24px -4px rgba(26,26,26,0.12)',
        'card-hover': '0 12px 40px -8px rgba(26,26,26,0.2)',
        drawer: '-8px 0 40px rgba(26,26,26,0.15)',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};

export default config;
