/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        accent: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
        },
        ink: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        income: {
          light: '#10B981',
          DEFAULT: '#059669',
          dark: '#34D399',
        },
        expense: {
          light: '#F43F5E',
          DEFAULT: '#E11D48',
          dark: '#FB7185',
        },
        lend: {
          light: '#F59E0B',
          DEFAULT: '#D97706',
          dark: '#FBBF24',
        },
        borrow: {
          light: '#8B5CF6',
          DEFAULT: '#7C3AED',
          dark: '#A78BFA',
        },
        refund: {
          light: '#22D3EE',
          DEFAULT: '#0891B2',
          dark: '#67E8F9',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        'card-hover': '0 8px 24px -6px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06)',
        nav: '0 -1px 8px rgba(15,23,42,0.06)',
        glow: '0 0 0 1px rgba(99,102,241,0.08), 0 12px 32px -8px rgba(99,102,241,0.35)',
        'glow-lg': '0 20px 60px -12px rgba(99,102,241,0.45)',
        elevated: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -8px rgba(15,23,42,0.10)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)',
        'grad-brand-soft': 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
        'grad-mesh': 'radial-gradient(at 20% 10%, rgba(99,102,241,0.22) 0px, transparent 50%), radial-gradient(at 85% 15%, rgba(124,58,237,0.18) 0px, transparent 50%), radial-gradient(at 50% 90%, rgba(16,185,129,0.14) 0px, transparent 50%)',
        'grid-lines': 'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite linear',
        float: 'float 6s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'fade-in': 'fade-in 0.4s ease-out',
      },
      backgroundSize: {
        'gradient-x': '200% 200%',
      },
    },
  },
  plugins: [],
};
