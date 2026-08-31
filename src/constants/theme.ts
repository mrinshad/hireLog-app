export const Colors = {
  // Theme compatibility
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    tint: '#2563EB',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#2563EB',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0F172A',
    tint: '#3B82F6',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#3B82F6',
  },

  // Brand / Primary
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',

  // Surfaces & Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceHover: '#E2E8F0',

  // Typography / Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders & Lines
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  borderLight: '#F1F5F9',

  // Semantic Status Colors
  success: '#16A34A',
  successBg: '#DCFCE7',
  successBorder: '#86EFAC',
  successText: '#15803D',

  // Status: Interview / Info
  info: '#0284C7',
  infoBg: '#E0F2FE',
  infoBorder: '#BAE6FD',
  infoText: '#0369A1',

  // Status: Ready / Warning
  warning: '#D97706',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',
  warningText: '#B45309',

  // Status: Rejected / Error
  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#B91C1C',

  // Status: Draft / Neutral
  neutral: '#64748B',
  neutralBg: '#F1F5F9',
  neutralBorder: '#CBD5E1',
  neutralText: '#475569',

  // Status: Withdrawn / Dark Neutral
  slate: '#475569',
  slateBg: '#E2E8F0',
  slateBorder: '#94A3B8',
  slateText: '#334155',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: 'normal',
  serif: 'serif',
  rounded: 'normal',
  mono: 'monospace',
} as const;

export const Typography = {
  screenTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  supporting: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const IconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
};
