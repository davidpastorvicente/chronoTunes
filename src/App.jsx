import { useCallback, useReducer } from 'react';
import { appMachine, createApp } from './machines/appMachine';
import PreferencesProvider from './preferences/PreferencesProvider';
import AuthGate from './components/AuthGate';
import SetupScreen from './components/setup/SetupScreen';
import GameScreen from './components/game/GameScreen';

/** Screen flow is `appMachine`: setup → game → (RESTART | EXIT). */
export default function App() {
  const [app, dispatch] = useReducer(appMachine.transition, undefined, createApp);
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
