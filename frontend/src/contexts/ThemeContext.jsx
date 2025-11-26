import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  LIGHT: 'light',
  // DARK: 'dark', // Future support
};

export const ACCENT_COLORS = [
  { id: 'mint', value: '#9FE6B6', label: 'Mint (Default)' },
  { id: 'blue', value: '#93C5FD', label: 'Sky Blue' },
  { id: 'purple', value: '#C4B5FD', label: 'Lavender' },
  { id: 'pink', value: '#FCA5A5', label: 'Pastel Pink' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('synapse_theme') || THEMES.LIGHT;
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('synapse_accent') || ACCENT_COLORS[0].value;
  });

  useEffect(() => {
    // Apply theme class
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${theme}-theme`);
    localStorage.setItem('synapse_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply accent color
    document.documentElement.style.setProperty('--accent', accentColor);
    
    // Also update related colors if needed (e.g., hover states could be derived)
    // For now, we just update the main accent
    localStorage.setItem('synapse_accent', accentColor);
  }, [accentColor]);

  const value = {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    availableThemes: [THEMES.LIGHT], // Only Light for now
    availableColors: ACCENT_COLORS,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
