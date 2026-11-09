import { useReducer, useState } from 'react';
import { authMachine, createAuth } from '../machines/authMachine';
import { useT } from '../preferences/context';
import AppHeader from './AppHeader';
import Button from './ui/Button';
import Icon from './ui/Icon';
import TextField from './ui/TextField';

const SESSION_KEY = 'chronotunes_auth';
const isAuthDisabled = () => import.meta.env.VITE_DISABLE_AUTH === 'true';

/**
 * Password gate (client-side only; it keeps casual visitors out, it is not a
 * security boundary). Disabled with VITE_DISABLE_AUTH=true.
 */
export default function AuthGate({ children }) {
  const t = useT();
  const [auth, dispatch] = useReducer(authMachine.transition, undefined, () =>
    createAuth(isAuthDisabled() || sessionStorage.getItem(SESSION_KEY) === 'authenticated'),
  );
  const [password, setPassword] = useState('');

  if (auth.value === 'unlocked') return children;

  const handleSubmit = (event) => {
    event.preventDefault();
    const expected = import.meta.env.VITE_APP_PASSWORD;
    if (expected && password === expected) sessionStorage.setItem(SESSION_KEY, 'authenticated');
    dispatch({ type: 'SUBMIT', password, expected });
    setPassword('');
  };

  return (
    <>
      <AppHeader />
      <main className="container auth-screen" data-screen="auth" data-state={auth.value}>
        <form className="card auth-card" onSubmit={handleSubmit}>
          <span className="icon-tile" aria-hidden="true"><Icon name="lock" size={20} /></span>
          <h1 className="heading-section">{t('auth.title')}</h1>
          <p className="text-secondary">{t('auth.subtitle')}</p>
          <TextField
            label={t('auth.label')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={auth.error && t(auth.error)}
            required
          />
          <Button type="submit" variant="primary" size="lg" block>
            {t('auth.submit')}
          </Button>
        </form>
      </main>
    </>
  );
}
