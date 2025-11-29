import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

export const ACCENT_COLORS = [
  { id: 'mint', light: '#9FE6B6', dark: '#10B981', label: 'Mint' },
  { id: 'blue', light: '#93C5FD', dark: '#3B82F6', label: 'Sky Blue' },
  { id: 'purple', light: '#C4B5FD', dark: '#8B5CF6', label: 'Lavender' },
  { id: 'pink', light: '#FCA5A5', dark: '#EC4899', label: 'Pastel Pink' },
  { id: 'orange', light: '#FDBA74', dark: '#F97316', label: 'Orange' },
  { id: 'yellow', light: '#FDE047', dark: '#EAB308', label: 'Yellow' },
  { id: 'teal', light: '#5EEAD4', dark: '#14B8A6', label: 'Teal' },
  { id: 'indigo', light: '#A5B4FC', dark: '#6366F1', label: 'Indigo' },
  { id: 'rose', light: '#FDA4AF', dark: '#F43F5E', label: 'Rose' },
  { id: 'gray', light: '#CBD5E1', dark: '#6B7280', label: 'Gray' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('synapse_theme') || THEMES.LIGHT;
  });

  // Store ID, not hex
  const [accentId, setAccentId] = useState(() => {
    const stored = localStorage.getItem('synapse_accent_id');
    // Fallback for migration from hex to id or default
    return stored || 'mint';
  });

  useEffect(() => {
    // Apply theme class
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${theme}-theme`);
    localStorage.setItem('synapse_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Find color object
    const colorObj = ACCENT_COLORS.find(c => c.id === accentId) || ACCENT_COLORS[0];
    // Determine hex based on theme
    const hex = theme === THEMES.DARK ? colorObj.dark : colorObj.light;
    
    // Apply accent color
    document.documentElement.style.setProperty('--accent', hex);
    
    // Calculate and set accent-light (for focus rings etc)
    // Simple opacity version for now, or could be defined in object
    document.documentElement.style.setProperty('--accent-light', `${hex}33`); // ~20% opacity

    localStorage.setItem('synapse_accent_id', accentId);
  }, [accentId, theme]);

  const value = {
    theme,
    setTheme,
    accentId,
    setAccentId,
    availableThemes: Object.values(THEMES),
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
