import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  ColorPalette,
  lightPalette,
  darkPalette,
  spacing,
  radii,
  typography,
  getNeumorphicCardStyle,
  getNeumorphicWellStyle,
} from '../theme';
import { getSettings, saveSettings } from '../database';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  cardStyle: ReturnType<typeof getNeumorphicCardStyle>;
  wellStyle: ReturnType<typeof getNeumorphicWellStyle>;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const settings = getSettings();
      return settings?.theme || 'system';
    } catch {
      return 'system';
    }
  });

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? darkPalette : lightPalette;
  }, [isDark]);

  const cardStyle = useMemo(() => getNeumorphicCardStyle(isDark), [isDark]);
  const wellStyle = useMemo(() => getNeumorphicWellStyle(isDark), [isDark]);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      saveSettings({ theme: newMode });
    } catch (e) {
      console.warn('Failed to save theme setting:', e);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        spacing,
        radii,
        typography,
        cardStyle,
        wellStyle,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
