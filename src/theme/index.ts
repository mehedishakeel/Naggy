export interface ColorPalette {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  urgent: string;
  urgentLight: string;
  high: string;
  highLight: string;
  normal: string;
  normalLight: string;
  low: string;
  lowLight: string;
  success: string;
  successLight: string;
  card: string;
  modal: string;
  tint: string;
  tabBar: string;
  tabBarBorder: string;
  well: string;
  shadowColor: string;
  highlightColor: string;
}

export const lightPalette: ColorPalette = {
  background: '#E9EEF5', // Soft slate-blue clay backdrop
  surface: '#FFFFFF', // Elevated tactile card
  surfaceSecondary: '#DEE5EE', // Sunken/recessed well
  surfaceTertiary: '#D2DCE8', // Deep recessed slot
  text: '#1E2530', // Deep slate navy
  textSecondary: '#64748B', // Medium slate gray
  textMuted: '#94A3B8', // Muted slate
  border: 'rgba(148, 163, 184, 0.28)', // Soft diffuse border
  borderSubtle: 'rgba(255, 255, 255, 0.85)', // Top highlight reflection
  primary: '#FF5A43', // Vibrant warm coral
  primaryLight: '#FFEAE6', // Soft coral tint
  primaryDark: '#E0412B',
  urgent: '#F43F5E', // Rose coral
  urgentLight: '#FFE4E9',
  high: '#F59E0B', // Amber
  highLight: '#FEF3C7',
  normal: '#10B981', // Emerald mint
  normalLight: '#D1FAE5',
  low: '#3B82F6', // Vivid electric blue
  lowLight: '#EFF6FF',
  success: '#10B981', // Emerald mint
  successLight: '#D1FAE5',
  card: '#FFFFFF',
  modal: '#FFFFFF',
  tint: '#FF5A43',
  tabBar: '#EFF3F8',
  tabBarBorder: 'rgba(148, 163, 184, 0.22)',
  well: '#DEE5EE',
  shadowColor: '#8E9EBA',
  highlightColor: 'rgba(255, 255, 255, 0.95)',
};

export const darkPalette: ColorPalette = {
  background: '#13151B', // Deep matte charcoal slate
  surface: '#1D212B', // Elevated matte card
  surfaceSecondary: '#161921', // Recessed dark well
  surfaceTertiary: '#252B37', // Highlighted pill
  text: '#F1F5F9', // Crisp slate white
  textSecondary: '#94A3B8', // Light slate
  textMuted: '#64748B', // Slate mute
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  primary: '#FF644E', // Radiant coral neon
  primaryLight: '#381E1A',
  primaryDark: '#FF5A43',
  urgent: '#FB7185',
  urgentLight: '#3D141E',
  high: '#FBBF24',
  highLight: '#3A2800',
  normal: '#34D399',
  normalLight: '#0B291E',
  low: '#60A5FA',
  lowLight: '#14273E',
  success: '#34D399',
  successLight: '#0B291E',
  card: '#1D212B',
  modal: '#1D212B',
  tint: '#FF644E',
  tabBar: '#171922',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',
  well: '#161921',
  shadowColor: '#000000',
  highlightColor: 'rgba(255, 255, 255, 0.06)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 9999,
};

export const getNeumorphicCardStyle = (isDark: boolean) => ({
  backgroundColor: isDark ? '#1D212B' : '#FFFFFF',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
  shadowColor: isDark ? '#000000' : '#8E9EBA',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: isDark ? 0.45 : 0.22,
  shadowRadius: 14,
  elevation: 4,
});

export const getNeumorphicWellStyle = (isDark: boolean) => ({
  backgroundColor: isDark ? '#161921' : '#DEE5EE',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(148, 163, 184, 0.3)',
});

export const typography = {
  titleLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  titleMedium: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  titleSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  micro: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
};
