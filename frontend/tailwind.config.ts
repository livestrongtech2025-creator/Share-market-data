import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary now maps to neon-cyan brand
        primary: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Secondary brand: magenta
        magenta: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        dark: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          925: '#0a0f1c',
          950: '#05070d',
        },
        success: '#34d399',
        danger:  '#fb7185',
        warning: '#fbbf24',
        info:    '#22d3ee',
        bullish: '#34d399',
        bearish: '#fb7185',
        neutral: '#64748b',
      },
      boxShadow: {
        'glow-cyan':    '0 8px 24px -6px rgba(34, 211, 238, 0.5), 0 0 0 1px rgba(34, 211, 238, 0.15) inset',
        'glow-magenta': '0 8px 24px -6px rgba(232, 121, 249, 0.5), 0 0 0 1px rgba(232, 121, 249, 0.15) inset',
        'glow-violet':  '0 8px 24px -6px rgba(139, 92, 246, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.15) inset',
        'glow-emerald': '0 8px 24px -6px rgba(52, 211, 153, 0.5), 0 0 0 1px rgba(52, 211, 153, 0.15) inset',
        'glow-rose':    '0 8px 24px -6px rgba(251, 113, 133, 0.5), 0 0 0 1px rgba(251, 113, 133, 0.15) inset',
        'glow-amber':   '0 8px 24px -6px rgba(251, 191, 36, 0.5), 0 0 0 1px rgba(251, 191, 36, 0.15) inset',
      },
      animation: {
        'fade-in':       'fadeIn 0.35s ease-out both',
        'slide-up':      'slideUp 0.4s ease-out both',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':       'shimmer 1.6s ease-in-out infinite',
        'glow':          'glow-pulse 2.4s ease-in-out infinite',
        'gradient-x':    'gradient-x 4s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0%' },
          '100%': { backgroundPosition: '-200% 0%' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 24px -6px rgba(34, 211, 238, 0.4)' },
          '50%':      { boxShadow: '0 0 36px -4px rgba(34, 211, 238, 0.7)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'neon-gradient':  'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #d946ef 100%)',
        'cyan-gradient':  'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
        'pink-gradient':  'linear-gradient(135deg, #e879f9 0%, #c026d3 100%)',
        'violet-gradient':'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
