import { LANGUAGES } from '../i18n';
import { usePreferences, useT } from '../preferences/context';
import Icon from './ui/Icon';

const FLAGS = { en: '\u{1F1EC}\u{1F1E7}', es: '\u{1F1EA}\u{1F1F8}' };

/**
 * Sticky top navigation (56px, backdrop blur). `status` renders in the centre
 * (e.g. whose turn it is) and `actions` before the preference controls.
 */
export default function AppHeader({ status, actions, onHome }) {
  const t = useT();
  const { language, setLanguage, theme, toggleTheme } = usePreferences();
  const base = import.meta.env.BASE_URL;

  return (
    <header className="app-header">
      <div className="app-header-inner container">
        {(() => {
          const content = (
            <>
              <img src={`${base}${theme === 'dark' ? 'logo-dark.svg' : 'logo.svg'}`} alt="" width="28" height="28" />
              <BrandName name={t('app.name')} className="brand-name" />
            </>
          );
          return onHome ? (
            <button type="button" className="brand brand-link" onClick={onHome}>{content}</button>
          ) : (
            <div className="brand">{content}</div>
          );
        })()}

        <div className="header-status">{status}</div>

        <div className="header-actions">
          <div className="segmented">
            <button
              type="button"
              className="segmented-item"
              onClick={() => setLanguage(LANGUAGES[(LANGUAGES.indexOf(language) + 1) % LANGUAGES.length])}
              aria-label={t('nav.switchLanguage')}
              title={t('nav.switchLanguage')}
            >
              <span className="flag" aria-hidden="true">{FLAGS[language]}</span>
            </button>
            <button
              type="button"
              className="segmented-item"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')}
              title={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Renders the name with a highlighted "Tunes" suffix. */
export function BrandName({ name, className }) {
  const index = name.indexOf('Tunes');
  if (index === -1) return <span className={className}>{name}</span>;
  return (
    <span className={className}>
      {name.slice(0, index)}
      <span className="brand-accent">Tunes</span>
    </span>
  );
}
