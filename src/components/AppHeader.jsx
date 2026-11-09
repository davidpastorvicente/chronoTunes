import { LANGUAGES } from '../i18n';
import { usePreferences, useT } from '../preferences/context';
import Icon from './ui/Icon';

/**
 * Sticky top navigation (56px, backdrop blur). `status` renders in the centre
 * (e.g. whose turn it is) and `actions` before the preference controls.
 */
export default function AppHeader({ status, actions }) {
  const t = useT();
  const { language, setLanguage, theme, toggleTheme } = usePreferences();
  const base = import.meta.env.BASE_URL;

  return (
    <header className="app-header">
      <div className="app-header-inner container">
        <div className="brand">
          <img src={`${base}${theme === 'dark' ? 'logo-dark.svg' : 'logo.svg'}`} alt="" width="28" height="28" />
          <span className="brand-name">{t('app.name')}</span>
        </div>

        <div className="header-status">{status}</div>

        <div className="header-actions">
          {actions}
          <div className="segmented" role="group" aria-label={t('nav.language')}>
            {LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                className="segmented-item"
                aria-pressed={language === code}
                lang={code}
                onClick={() => setLanguage(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')}
            title={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </div>
    </header>
  );
}
