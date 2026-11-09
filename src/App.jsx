import { useCallback, useEffect, useReducer } from 'react';
import { appMachine, createApp } from './machines/appMachine';
import { loadSavedApp, saveApp } from './game/savedGame';
import PreferencesProvider from './preferences/PreferencesProvider';
import AuthGate from './components/AuthGate';
import SetupScreen from './components/setup/SetupScreen';
import GameScreen from './components/game/GameScreen';

const initApp = () => loadSavedApp() ?? createApp();

/**
 * Screen flow is `appMachine`: setup → game → (RESTART | EXIT).
 * A game in progress is saved so reloading the page resumes it.
 */
export default function App() {
  const [app, dispatch] = useReducer(appMachine.transition, undefined, initApp);
  useEffect(() => saveApp(app), [app]);
  const startGame = useCallback((config) => dispatch({ type: 'START_GAME', config }), []);
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);
  const exit = useCallback(() => dispatch({ type: 'EXIT' }), []);

  return (
    <PreferencesProvider>
      <AuthGate>
        {app.value === 'game' ? (
          <GameScreen
            key={app.round}
            config={app.config}
            round={app.round}
            onRestart={app.config.mode === 'local' ? restart : undefined}
            onExit={exit}
          />
        ) : (
          <SetupScreen onStart={startGame} />
        )}
      </AuthGate>
    </PreferencesProvider>
  );
}
