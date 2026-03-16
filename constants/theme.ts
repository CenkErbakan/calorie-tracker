export const Colors = {
  // Background
  background: '#0A0F1E',
  surface: '#111827',
  surface2: '#1E2A3A',
  surface3: '#243447',

  // Primary - Mint Green
  primary: '#00D4AA',
  primaryDark: '#00B894',
  primaryGlow: 'rgba(0, 212, 170, 0.15)',

  // Accent Colors
  accent: '#FF6B6B',
  accentOrange: '#FF9500',
  accentBlue: '#0099FF',
  accentPink: '#FF6B9D',

  // Text
  text: '#FFFFFF',
  textSecondary: '#8B95A7',
  textTertiary: '#5A6578',

  // Utility
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#00D4AA',
  error: '#FF6B6B',
  warning: '#FF9500',

  // Gradients (for reference, use with LinearGradient)
  gradientPrimary: ['#00D4AA', '#0099FF'] as const,
  gradientCard: ['#1E2A3A', '#111827'] as const,
  gradientGold: ['#FFD700', '#FFA500'] as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  accentGlow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

export const Typography = {
  display: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  smallMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  stats: {
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  statsLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
} as const;
