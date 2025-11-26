import React, { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { enUS, es, ca } from 'date-fns/locale';

// Map i18n language codes to date-fns locale objects
const locales = {
  en: enUS,
  es: es,
  ca: ca,
};

const DateFnsLocaleContext = createContext(es); // Default to Spanish

export function DateFnsLocaleProvider({ children }) {
  const { i18n } = useTranslation();
  
  const locale = useMemo(() => {
    return locales[i18n.language] || es;
  }, [i18n.language]);

  return (
    <DateFnsLocaleContext.Provider value={locale}>
      {children}
    </DateFnsLocaleContext.Provider>
  );
}

export function useDateFnsLocale() {
  return useContext(DateFnsLocaleContext);
}
