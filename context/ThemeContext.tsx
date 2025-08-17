// context/ThemeContext.tsx
// context/ThemeContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePreference = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

type ThemeContextType = {
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;
  colorScheme: ColorScheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useSystemColorScheme() ?? 'light';
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('app-theme-preference') as ThemePreference | null;
      if (savedTheme) {
        setThemePreferenceState(savedTheme);
      }
    };
    loadTheme();
  }, []);

  const setThemePreference = async (newTheme: ThemePreference) => {
    setThemePreferenceState(newTheme);
    await AsyncStorage.setItem('app-theme-preference', newTheme);
  };

  // Determine the final color scheme based on user preference and system setting
  const colorScheme = themePreference === 'system' ? systemColorScheme : themePreference;

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// This is the ONLY hook components should use to get the theme.
export const useColorScheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a CustomThemeProvider');
  }
  return context;
};