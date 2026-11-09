import { createContext, useCallback, useContext } from 'react';
import { translate } from '../i18n';

export const PreferencesContext = createContext(null);

export const STORAGE_KEYS = Object.freeze({
  language: 'chronotunes_language',
  theme: 'theme',
  setup: 'chronotunes_setup',
});

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return value;
}

/** Returns `t(key, params)` bound to the current language. */
export function useT() {
  const { language } = usePreferences();
  return useCallback((key, params) => translate(language, key, params), [language]);
}
