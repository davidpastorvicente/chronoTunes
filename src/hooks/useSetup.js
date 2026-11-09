import { useCallback, useEffect, useReducer } from 'react';
import { createSetup, sanitizeSettings, setupMachine } from '../machines/setupMachine';
import { normalizePlayers, SessionError } from '../game/session';
import { STORAGE_KEYS } from '../preferences/context';
import {
  createSession,
  deleteSession,
  joinSession,
  leaveSession,
  sendGameEvent,
  subscribeToSession,
} from '../services/gameSession';

const LOBBY_STATES = new Set(['hostLobby', 'starting', 'guestLobby']);
const JOIN_PARAM = 'join';

const errorKey = (error) => {
  if (error instanceof SessionError) return error.code;
  console.error(error);
  return 'errors.network';
};

/** Builds the initial setup from saved preferences and an optional `?join=CODE` invite link. */
function initSetup() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.setup)) ?? {};
  } catch {
    saved = {};
  }
  const url = new URL(globalThis.location.href);
  const joinCode = url.searchParams.get(JOIN_PARAM) ?? '';
  if (joinCode) {
    url.searchParams.delete(JOIN_PARAM);
    globalThis.history.replaceState(null, '', url);
  }
  return createSetup({
    settings: sanitizeSettings(saved.settings),
    myName: typeof saved.myName === 'string' ? saved.myName : '',
    joinCode,
  });
}

export const inviteLink = (code) =>
  `${globalThis.location.origin}${import.meta.env.BASE_URL}?${JOIN_PARAM}=${encodeURIComponent(code)}`;

/**
 * Drives the setup wizard: owns the setup machine and performs its side
 * effects (Firebase create/join/leave/start, lobby subscription, persistence).
 *
 * @param {(config: object) => void} onStart called once the machine reaches `ready`
 * @param {(n: number) => string} defaultPlayerName localized fallback for blank names
 */
export function useSetup(onStart, defaultPlayerName) {
  const [state, dispatch] = useReducer(setupMachine.transition, undefined, initSetup);
  const { session } = state;
  const lobbyCode = LOBBY_STATES.has(state.value) ? session?.code : null;

  // Remember settings and name for next time.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.setup, JSON.stringify({ settings: state.settings, myName: state.myName }));
  }, [state.settings, state.myName]);

  // Live lobby: player list, game start, or the host closing the game.
  useEffect(() => {
    if (!lobbyCode) return undefined;
    return subscribeToSession(
      lobbyCode,
      (doc) => {
        if (!doc) return dispatch({ type: 'GONE' });
        const payload = { players: normalizePlayers(doc.players), settings: doc.settings };
        const started = (doc.state?.gamePhase ?? 'waiting') !== 'waiting';
        dispatch({ type: started ? 'STARTED' : 'SESSION_UPDATED', ...payload });
      },
      (error) => dispatch({ type: 'FAILED', error: errorKey(error) }),
    );
  }, [lobbyCode]);

  useEffect(() => {
    if (state.value === 'ready') onStart(state.config);
  }, [state.value, state.config, onStart]);

  /** Dispatches and returns the state the machine moves to. */
  const send = (event) => {
    dispatch(event);
    return setupMachine.transition(state, event);
  };

  const actions = {
    send,
    back: () => {
      if (state.value === 'hostLobby') void deleteSession(session.code).catch(errorKey);
      if (state.value === 'guestLobby') void leaveSession(session.code, session.playerId).catch(errorKey);
      send({ type: 'BACK' });
    },
    startLocal: () => {
      const playerNames = state.settings.playerNames.map((name, i) => name.trim() || defaultPlayerName(i + 1));
      send({ type: 'START', playerNames });
    },
    submitHost: () => {
      if (send({ type: 'SUBMIT' }).value !== 'creating') return;
      createSession({ settings: state.settings, hostName: state.myName })
        .then(({ code, playerId }) => dispatch({ type: 'CREATED', code, playerId }))
        .catch((error) => dispatch({ type: 'FAILED', error: errorKey(error) }));
    },
    submitJoin: () => {
      if (send({ type: 'SUBMIT' }).value !== 'joining') return;
      joinSession({ code: state.joinCode, name: state.myName })
        .then((joined) => dispatch({ type: 'JOINED', ...joined }))
        .catch((error) => dispatch({ type: 'FAILED', error: errorKey(error) }));
    },
    startOnline: () => {
      if (send({ type: 'START' }).value !== 'starting') return;
      sendGameEvent(session.code, { type: 'START' })
        .then((accepted) => accepted || dispatch({ type: 'FAILED', error: 'errors.network' }))
        .catch((error) => dispatch({ type: 'FAILED', error: errorKey(error) }));
    },
  };

  return { state, actions, can: useCallback((type) => setupMachine.can(state, { type }), [state]) };
}
