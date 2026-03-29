// 🌟 Tazakkur - Light Minimalist iOS Theme

// ========== LIGHT THEME (DEFAULT) ==========
export const Colors = {
  // Backgrounds
  background: '#FFFFFF',           // Чистый белый
  backgroundPage: '#F8F6F2',       // Тёплый off-white
  surface: '#FFFFFF',              // Белые карточки
  surfaceAccent: '#FDF9F4',        // Кремовый оттенок
  
  // Gold (Primary)
  primary: '#C4963A',              // Тёплое глубокое золото
  primaryLight: '#E8C97A',         // Для фонов и бейджей
  primaryText: '#A07C28',          // Для читаемости на белом
  primaryBorder: '#F0DFA0',        // Тонкие рамки
  
  // Green (Islamic accent)
  green: '#2E7D5B',                // Исламский средний зелёный
  greenLight: '#4CAF7D',           // Для иконок и успеха
  greenBackground: '#F0F8F4',      // Очень светлый зелёный тинт
  greenDark: '#1B5E3B',            // Только для маленьких деталей
  
  // Text
  textPrimary: '#1A1A2E',          // Почти чёрный
  textSecondary: '#6B7280',        // Средний серый
  textTertiary: '#9CA3AF',         // Светлый серый
  
  // UI Elements
  border: '#E5E7EB',               // Очень светлая граница
  error: '#EF4444',                // Красный
  success: '#2E7D5B',              // Зелёный успех
  
  // Tab Bar
  tabBar: '#FFFFFF',
  tabBarActive: '#C4963A',
  tabBarInactive: '#9CA3AF',
  
  // Other
  overlay: 'rgba(0,0,0,0.4)',
  white: '#FFFFFF',

  // Aliases for legacy dark-theme references used across screens
  gold: '#C4963A',
  cardDark: '#FDF9F4',
  cardLight: '#F8F6F2',
  darkGreen: '#E5E7EB',
  mediumGreen: '#2E7D5B',
  goldBorder: '#F0DFA0',
  lightGreen: '#4CAF7D',
  inputBg: '#F8F6F2',
};

// ========== DARK THEME ==========
export const ColorsDark = {
  // Backgrounds
  background: '#0F0F0F',
  backgroundPage: '#1A1A1A',
  surface: '#242424',
  surfaceAccent: '#2A2A2A',
  
  // Gold (Primary) - ярче для тёмного фона
  primary: '#D4A853',
  primaryLight: '#3D3420',
  primaryText: '#D4A853',
  primaryBorder: '#4A3C20',
  
  // Green
  green: '#3D9B72',
  greenLight: '#4CAF7D',
  greenBackground: '#1A2E25',
  greenDark: '#2E7D5B',
  
  // Text
  textPrimary: '#F5F5F5',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  
  // UI Elements
  border: '#333333',
  error: '#EF4444',
  success: '#3D9B72',
  
  // Tab Bar
  tabBar: '#1A1A1A',
  tabBarActive: '#D4A853',
  tabBarInactive: '#6B7280',
  
  // Other
  overlay: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',
};

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
