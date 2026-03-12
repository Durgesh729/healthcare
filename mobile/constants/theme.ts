// Professional Design System - Health Monitor App
// Inspired by modern healthcare apps like Practo, MyChart, Zocdoc

export const COLORS = {
  // Primary Brand Colors
  primary: {
    main: '#2563EB',
    light: '#3B82F6',
    dark: '#1D4ED8',
    gradient: ['#2563EB', '#1D4ED8'] as const,
    background: '#EFF6FF',
  },
  
  // Secondary Colors
  secondary: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
  },
  
  // Accent Colors
  accent: {
    orange: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
  },
  
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },
  
  // Semantic Colors
  success: {
    main: '#10B981',
    light: '#D1FAE5',
    background: '#ECFDF5',
  },
  warning: {
    main: '#F59E0B',
    light: '#FEF3C7',
    background: '#FFFBEB',
  },
  error: {
    main: '#EF4444',
    light: '#FEE2E2',
    background: '#FEF2F2',
  },
  info: {
    main: '#3B82F6',
    light: '#DBEAFE',
    background: '#EFF6FF',
  },
  
  // Background Colors
  background: {
    primary: '#F9FAFB',
    secondary: '#FFFFFF',
    card: '#FFFFFF',
    input: '#F3F4F6',
  },
  
  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#6B7280',
    inverse: '#FFFFFF',
    link: '#2563EB',
  },
  
  // Border Colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
    focus: '#2563EB',
  },
};

export const FONTS = {
  // Font Families (system fonts for cross-platform)
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
  
  // Font Sizes
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Icon Configuration
export const ICON_SIZE = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};

export default {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ICON_SIZE,
};
