import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#09090B',
        surface: '#111113',
        field: '#0C0C0E',
        accent: '#4ECDC4',
      },
      spacing: {
        13: '3.25rem',
      },
      boxShadow: {
        card: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        elevated:
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 24px 48px -12px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};

export default config;
