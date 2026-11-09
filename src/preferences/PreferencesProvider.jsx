import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../i18n';
import { PreferencesContext, STORAGE_KEYS } from './context';

const systemTheme = () => (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function readStored(key, allowed, fallback) {
  const value = localStorage.getItem(key);
  return allowed.includes(value) ? value : fallback();
}

/** Single source of truth for language and theme, persisted to localStorage. */
export default function PreferencesProvider({ children }) {
  const [language, setLanguageState] = useState(() =>
    readStored(STORAGE_KEYS.language, LANGUAGES, () => DEFAULT_LANGUAGE),
  );
  const [theme, setTheme] = useState(() => readStored(STORAGE_KEYS.theme, ['light', 'dark'], systemTheme));

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  const setLanguage = useCallback((next) => {
    if (LANGUAGES.includes(next)) setLanguageState(next);
  }, []);
  const toggleTheme = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(
    () => ({ language, setLanguage, theme, toggleTheme }),
    [language, setLanguage, theme, toggleTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
