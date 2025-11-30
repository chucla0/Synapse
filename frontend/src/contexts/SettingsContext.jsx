import { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const SettingsContext = createContext();

const INITIAL_SETTINGS = {
  display: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeFormat: '24h',
    weekStart: 'monday',
    defaultView: 'month',
    language: 'es',
    density: 'standard'
  },
  notifications: {
    defaultAlert: 15,
    browserNotifications: false,
    emailNotifications: true,
    soundEnabled: true
  },
  integrations: {
    meetingService: 'google_meet'
  }
};

export function SettingsProvider({ children }) {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('synapse_web_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('synapse_web_settings', JSON.stringify(settings));
    
    // Apply Language
    if (settings.display.language !== i18n.resolvedLanguage) {
      i18n.changeLanguage(settings.display.language);
    }

    // Apply Density
    document.body.dataset.density = settings.display.density;

  }, [settings, i18n]);

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // Helper to get weekStartsOn index (0 for Sunday, 1 for Monday)
  const getWeekStartDay = () => {
    return settings.display.weekStart === 'sunday' ? 0 : 1;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, getWeekStartDay }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
