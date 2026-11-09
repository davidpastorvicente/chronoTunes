import en from './en.json';
import es from './es.json';

/**
 * Translations live in one JSON file per language. Keys are dot paths
 * (`t('setup.start')`) and `{name}` placeholders are interpolated.
 * Missing keys fall back to English, then to the key itself, so a typo is
 * visible in the UI instead of crashing. `i18n.test.js` keeps locales in sync.
 */
export const MESSAGES = { en, es };
export const LANGUAGES = Object.freeze(['en', 'es']);
export const DEFAULT_LANGUAGE = 'es';

const lookup = (messages, key) =>
  key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), messages);

export function translate(language, key, params) {
  const template = lookup(MESSAGES[language], key) ?? lookup(MESSAGES.en, key);
  if (typeof template !== 'string') {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key "${key}"`);
    return key;
  }
  if (!params) return template;
  return template.replaceAll(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
