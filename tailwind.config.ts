import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0F14',
        surface: '#121821',
        line: '#1E293B',
        ink: '#F1F5F9',
        muted: '#94A3B8',
        accent: '#4ECDC4',
        ok: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};

export default config;
