// 🌟 Tazakkur - Light Minimalist iOS Theme

// ========== LIGHT THEME (DEFAULT) ==========
export const Colors = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundPage: '#F8F6F2',
  surface: '#FFFFFF',
  surfaceAccent: '#FDF9F4',

  // Gold (Primary)
  primary: '#C4963A',
  primaryLight: '#E8C97A',
  primaryText: '#A07C28',
  primaryBorder: '#F0DFA0',

  // Green (Islamic accent)
  green: '#2E7D5B',
  greenLight: '#4CAF7D',
  greenBackground: '#F0F8F4',
  greenDark: '#1B5E3B',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // UI Elements
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#2E7D5B',

  // Tab Bar
  tabBar: '#FFFFFF',
  tabBarActive: '#C4963A',
  tabBarInactive: '#9CA3AF',

  // Other
  overlay: 'rgba(0,0,0,0.4)',
  white: '#FFFFFF',

  // Aliases
  gold: '#C4963A',
  cardDark: '#FDF9F4',
  cardLight: '#F8F6F2',
  darkGreen: '#E5E7EB',
  mediumGreen: '#2E7D5B',
  goldBorder: '#F0DFA0',
  lightGreen: '#4CAF7D',
  inputBg: '#F8F6F2',
  goldBackground: '#FFF8EE',
};

// ========== DARK THEME ==========
export const DarkColors = {
  background: '#1A1A2E',
  backgroundPage: '#16213E',
  surface: '#0F3460',
  surfaceAccent: '#1A1A2E',
  primary: '#C4963A',
  primaryLight: '#E8C97A',
  primaryText: '#C4963A',
  primaryBorder: '#8B6914',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B8CC',
  textTertiary: '#7A8499',
  border: '#2A3550',
  green: '#4CAF7D',
  greenLight: '#81C784',
  greenBackground: '#1B3A2D',
  greenDark: '#2E7D5B',
  tabBar: '#0F1729',
  tabBarActive: '#C4963A',
  tabBarInactive: '#4A5568',
  error: '#EF5350',
  success: '#66BB6A',
  overlay: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',
  // Legacy aliases
  gold: '#C4963A',
  cardDark: '#0F3460',
  cardLight: '#1A1A2E',
  darkGreen: '#2A3550',
  mediumGreen: '#4CAF7D',
  goldBorder: '#8B6914',
  lightGreen: '#81C784',
  inputBg: '#16213E',
  goldBackground: '#1A1A2E',
};

export const ColorsDark = DarkColors;

// ========== SHADOWS (iOS-style) ==========
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardMedium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  gold: {
    shadowColor: '#C4963A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 5,
  },
  hero: {
    shadowColor: '#C4963A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 6,
  },
};

// ========== TYPOGRAPHY ==========
export const Typography = {
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  arabic: {
    fontSize: 28,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    color: Colors.primary,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};
