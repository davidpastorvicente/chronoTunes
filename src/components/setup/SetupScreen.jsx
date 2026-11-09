import { useCallback, useEffect, useRef } from 'react';
import { MAX_LOCAL_PLAYERS, MAX_NAME_LENGTH } from '../../game/rules';
import { useSetup } from '../../hooks/useSetup';
import { GAME_CODE_LENGTH } from '../../machines/setupMachine';
import { useT } from '../../preferences/context';
import { isFirebaseConfigured } from '../../firebase';
import AppHeader from '../AppHeader';
import Button from '../ui/Button';
import ChoiceGroup from '../ui/ChoiceGroup';
import DotGrid from '../ui/DotGrid';
import TextField from '../ui/TextField';
import GameSettingsFields from './GameSettingsFields';
import Lobby from './Lobby';
import OptionCard from './OptionCard';

const PLAYER_COUNTS = Array.from({ length: MAX_LOCAL_PLAYERS }, (_, i) => i + 1);

/** Setup wizard. Every step is a state of `setupMachine` (see docs/state-machines.md). */
export default function SetupScreen({ onStart }) {
  const t = useT();
  const defaultPlayerName = useCallback((n) => t('setup.defaultPlayerName', { n }), [t]);
  const { state, actions, can } = useSetup(onStart, defaultPlayerName);
  const panelRef = useRef(null);
  const previousStep = useRef(state.value);

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (previousStep.current === state.value) return;
    previousStep.current = state.value;
    panelRef.current?.querySelector('h2')?.focus();
  }, [state.value]);

  return (
    <>
      <AppHeader />
      <main className="setup-screen" data-screen="setup" data-step={state.value}>
        <section className="hero">
          <DotGrid />
          <div className="container hero-inner">
            <h1 className="heading-display">{t('app.name')}</h1>
            <p className="hero-tagline">{t('app.tagline')}</p>
          </div>
        </section>

        <div className="container">
          <div className="card setup-panel" ref={panelRef}>
            {can('BACK') && (
              <Button variant="ghost" size="sm" icon="arrowLeft" className="back-button" onClick={actions.back}>
                {t('setup.back')}
              </Button>
            )}
            <Step state={state} actions={actions} />
          </div>
        </div>
      </main>
    </>
  );
}

function Step({ state, actions }) {
  const t = useT();
  const { send } = actions;
  const updateSettings = (patch) => send({ type: 'UPDATE_SETTINGS', patch });
  const error = state.error && t(state.error);

  switch (state.value) {
    case 'chooseMode':
      return (
        <div className="stack">
          <h2 className="heading-section" tabIndex={-1}>{t('setup.modeTitle')}</h2>
          <div className="option-grid">
            <OptionCard
              icon="smartphone"
              title={t('setup.local.title')}
              description={t('setup.local.description')}
              onClick={() => send({ type: 'CHOOSE_LOCAL' })}
            />
            <OptionCard
              icon="users"
              title={t('setup.online.title')}
              description={t('setup.online.description')}
              disabled={!isFirebaseConfigured()}
              note={isFirebaseConfigured() ? undefined : t('errors.onlineUnavailable')}
              onClick={() => send({ type: 'CHOOSE_ONLINE' })}
            />
          </div>
        </div>
      );

    case 'localSetup':
      return (
        <form className="stack" onSubmit={(event) => { event.preventDefault(); actions.startLocal(); }}>
          <h2 className="heading-section" tabIndex={-1}>{t('setup.localTitle')}</h2>
          <ChoiceGroup
            legend={t('setup.players')}
            value={state.settings.playerNames.length}
            options={PLAYER_COUNTS.map((value) => ({ value, label: String(value) }))}
            onChange={(count) => send({ type: 'SET_PLAYER_COUNT', count })}
          />
          <div className="name-grid">
            {state.settings.playerNames.map((name, index) => (
              <TextField
                key={index} // NOSONAR: inputs are positional, the index is their identity
                label={t('setup.playerNameLabel', { n: index + 1 })}
                placeholder={t('setup.defaultPlayerName', { n: index + 1 })}
                value={name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                onChange={(event) => send({ type: 'SET_PLAYER_NAME', index, name: event.target.value })}
              />
            ))}
          </div>
          <GameSettingsFields settings={state.settings} onChange={updateSettings} />
          <Button type="submit" variant="primary" size="lg" block iconAfter="arrowRight">
            {t('setup.start')}
          </Button>
        </form>
      );

    case 'onlineMenu':
      return (
        <div className="stack">
          <h2 className="heading-section" tabIndex={-1}>{t('setup.onlineTitle')}</h2>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="option-grid">
            <OptionCard icon="plus" title={t('setup.host.title')} description={t('setup.host.description')} onClick={() => send({ type: 'HOST' })} />
            <OptionCard icon="logIn" title={t('setup.join.title')} description={t('setup.join.description')} onClick={() => send({ type: 'JOIN' })} />
          </div>
        </div>
      );

    case 'hostSetup':
    case 'creating':
      return (
        <form className="stack" onSubmit={(event) => { event.preventDefault(); actions.submitHost(); }}>
          <h2 className="heading-section" tabIndex={-1}>{t('setup.host.title')}</h2>
          <TextField
            label={t('setup.yourName')}
            placeholder={t('setup.yourNamePlaceholder')}
            value={state.myName}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            error={error}
            onChange={(event) => send({ type: 'SET_NAME', value: event.target.value })}
          />
          <GameSettingsFields settings={state.settings} onChange={updateSettings} />
          <Button type="submit" variant="primary" size="lg" block loading={state.value === 'creating'}>
            {state.value === 'creating' ? t('setup.creating') : t('setup.createGame')}
          </Button>
        </form>
      );

    case 'joinForm':
    case 'joining':
      return (
        <form className="stack" onSubmit={(event) => { event.preventDefault(); actions.submitJoin(); }}>
          <h2 className="heading-section" tabIndex={-1}>{t('setup.join.title')}</h2>
          <TextField
            className="code-field"
            label={t('setup.gameCode')}
            hint={t('setup.gameCodeHint')}
            value={state.joinCode}
            maxLength={GAME_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(event) => send({ type: 'SET_JOIN_CODE', value: event.target.value })}
          />
          <TextField
            label={t('setup.yourName')}
            placeholder={t('setup.yourNamePlaceholder')}
            value={state.myName}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            onChange={(event) => send({ type: 'SET_NAME', value: event.target.value })}
          />
          {error && <p className="field-error" role="alert">{error}</p>}
          <Button type="submit" variant="primary" size="lg" block loading={state.value === 'joining'}>
            {state.value === 'joining' ? t('setup.joining') : t('setup.joinGame')}
          </Button>
        </form>
      );

    case 'hostLobby':
    case 'starting':
    case 'guestLobby':
      return (
        <>
          {error && <p className="field-error" role="alert">{error}</p>}
          <Lobby
            session={state.session}
            isHost={state.value !== 'guestLobby'}
            starting={state.value === 'starting'}
            onStart={actions.startOnline}
          />
        </>
      );

    default:
      return null;
  }
}
