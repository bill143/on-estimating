import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NEXUS ON Estimating Brand
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Pipeline stage colors
        pipeline: {
          lead: '#6366f1',
          estimating: '#f59e0b',
          review: '#3b82f6',
          submitted: '#8b5cf6',
          won: '#10b981',
          lost: '#ef4444',
        },
        // CSI Division colors (for cost breakdowns)
        csi: {
          general: '#6b7280',    // 01 - General Requirements
          sitework: '#92400e',   // 02 - Existing Conditions / Sitework
          concrete: '#64748b',   // 03 - Concrete
          masonry: '#b45309',    // 04 - Masonry
          metals: '#475569',     // 05 - Metals
          wood: '#a16207',       // 06 - Wood/Plastics
          thermal: '#0891b2',    // 07 - Thermal & Moisture
          openings: '#7c3aed',   // 08 - Openings
          finishes: '#db2777',   // 09 - Finishes
          specialties: '#059669', // 10 - Specialties
          equipment: '#d97706',  // 11 - Equipment
          furnishings: '#8b5cf6', // 12 - Furnishings
          mechanical: '#2563eb', // 23 - HVAC
          electrical: '#dc2626', // 26 - Electrical
          plumbing: '#0d9488',   // 22 - Plumbing
        },
        // Cost category colors
        cost: {
          material: '#3b82f6',   // Blue
          labor: '#f59e0b',      // Amber
          equipment: '#6366f1',  // Indigo
          subcontractor: '#10b981', // Emerald
          other: '#8b5cf6',      // Purple
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
