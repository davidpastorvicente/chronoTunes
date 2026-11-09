import { createMachine } from './createMachine.js';
import {
  CATEGORIES,
  CONTENT_SETS,
  MAX_LOCAL_PLAYERS,
  MAX_NAME_LENGTH,
  MIN_ONLINE_PLAYERS,
  WINNING_SCORES,
} from '../game/rules.js';

/**
 * Game setup wizard. Replaces the old `gameMode` × `multiplayerMode` string
 * pair (which allowed impossible combinations) with explicit steps.
 *
 * Async work (creating/joining a Firebase session) is triggered by the UI
 * when the machine *enters* `creating` / `joining`, and its outcome is fed
 * back as CREATED / JOINED / FAILED events. The final `ready` state carries
 * the `config` used to start the game.
 *
 * Errors are i18n keys (e.g. `errors.nameRequired`) so the machine stays
 * language-agnostic.
 */

export const GAME_CODE_LENGTH = 6;

export const DEFAULT_SETTINGS = Object.freeze({
  category: 'songs',
  contentSet: 'everything',
  winningScore: 10,
  playerNames: ['', ''],
});

export const normalizeCode = (code = '') =>
  code.toUpperCase().replaceAll(/[^A-Z0-9]/g, '').slice(0, GAME_CODE_LENGTH);

/** Drops anything invalid from (untrusted) stored settings. */
export function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};
  if (CATEGORIES.includes(raw.category)) clean.category = raw.category;
  if (CONTENT_SETS.includes(raw.contentSet)) clean.contentSet = raw.contentSet;
  if (WINNING_SCORES.includes(raw.winningScore)) clean.winningScore = raw.winningScore;
  if (
    Array.isArray(raw.playerNames) &&
    raw.playerNames.length >= 1 &&
    raw.playerNames.length <= MAX_LOCAL_PLAYERS &&
    raw.playerNames.every((name) => typeof name === 'string')
  ) {
    clean.playerNames = raw.playerNames.map((name) => name.slice(0, MAX_NAME_LENGTH));
  }
  return clean;
}

/**
 * @param {{ settings?: object, myName?: string, joinCode?: string }} [init]
 *   `joinCode` (from an invite link) opens the join form directly.
 */
export function createSetup({ settings = {}, myName = '', joinCode = '' } = {}) {
  const code = normalizeCode(joinCode);
  return {
    value: code ? 'joinForm' : 'chooseMode',
    settings: { ...DEFAULT_SETTINGS, ...settings },
    myName,
    joinCode: code,
    session: null,
    config: null,
    error: null,
  };
}

const clearError = (state) => ({ ...state, error: null });
const withError = (error) => (state) => ({ ...state, error });

const updateSettings = {
  target: 'localSetup',
  update: (state, { patch }) => ({ ...state, settings: { ...state.settings, ...patch } }),
};

const sessionUpdated = (state, { players, settings }) => ({
  ...state,
  session: { ...state.session, players, settings: settings ?? state.session.settings },
});

const toReady = (state, { players, settings }) => ({
  ...state,
  config: {
    mode: 'online',
    ...(settings ?? state.session.settings),
    gameCode: state.session.code,
    playerId: state.session.playerId,
    isHost: state.session.isHost,
    playerNames: players.map((p) => p.name),
  },
});

const setMyName = (state, { value }) => ({ ...state, myName: value, error: null });

export const setupMachine = createMachine({
  id: 'setup',
  initial: 'chooseMode',
  states: {
    chooseMode: {
      description: 'Pick single-device or multi-device play.',
      on: {
        CHOOSE_LOCAL: { target: 'localSetup', update: clearError },
        CHOOSE_ONLINE: { target: 'onlineMenu', update: clearError },
      },
    },
    localSetup: {
      description: 'Configure a pass-and-play game on this device.',
      on: {
        UPDATE_SETTINGS: updateSettings,
        SET_PLAYER_COUNT: {
          target: 'localSetup',
          guard: (_, { count }) => Number.isInteger(count) && count >= 1 && count <= MAX_LOCAL_PLAYERS,
          update: (state, { count }) => ({
            ...state,
            settings: {
              ...state.settings,
              playerNames: Array.from({ length: count }, (_, i) => state.settings.playerNames[i] ?? ''),
            },
          }),
        },
        SET_PLAYER_NAME: {
          target: 'localSetup',
          update: (state, { index, name }) => ({
            ...state,
            settings: {
              ...state.settings,
              playerNames: state.settings.playerNames.map((n, i) => (i === index ? name : n)),
            },
          }),
        },
        START: {
          target: 'ready',
          description: 'UI resolves blank names to defaults and passes them in the event.',
          update: (state, { playerNames }) => ({
            ...state,
            config: {
              mode: 'local',
              category: state.settings.category,
              contentSet: state.settings.contentSet,
              winningScore: state.settings.winningScore,
              playerNames,
            },
          }),
        },
        BACK: 'chooseMode',
      },
    },
    onlineMenu: {
      description: 'Host a new game or join an existing one.',
      on: {
        HOST: { target: 'hostSetup', update: clearError },
        JOIN: { target: 'joinForm', update: clearError },
        BACK: { target: 'chooseMode', update: clearError },
      },
    },
    hostSetup: {
      description: 'Host picks settings and their own name.',
      on: {
        UPDATE_SETTINGS: { ...updateSettings, target: 'hostSetup' },
        SET_NAME: { target: 'hostSetup', update: setMyName },
        SUBMIT: {
          target: ['creating', 'hostSetup'],
          update: (state) =>
            state.myName.trim()
              ? { ...state, value: 'creating', error: null }
              : { ...state, value: 'hostSetup', error: 'errors.nameRequired' },
        },
        BACK: { target: 'onlineMenu', update: clearError },
      },
    },
    creating: {
      description: 'Creating the session in Firebase.',
      on: {
        CREATED: {
          target: 'hostLobby',
          update: (state, { code, playerId }) => ({
            ...state,
            session: { code, playerId, isHost: true, players: [], settings: state.settings },
          }),
        },
        FAILED: { target: 'hostSetup', update: (state, { error }) => ({ ...state, error }) },
      },
    },
    hostLobby: {
      description: 'Host shares the code and waits for players.',
      on: {
        SESSION_UPDATED: { target: 'hostLobby', update: sessionUpdated },
        STARTED: { target: 'ready', update: toReady },
        START: {
          target: ['starting', 'hostLobby'],
          update: (state) =>
            state.session.players.length >= MIN_ONLINE_PLAYERS
              ? { ...state, value: 'starting', error: null }
              : { ...state, value: 'hostLobby', error: 'errors.notEnoughPlayers' },
        },
        FAILED: { target: 'hostLobby', update: (state, { error }) => ({ ...state, error }) },
        GONE: { target: 'onlineMenu', update: withError('errors.sessionClosed') },
        BACK: { target: 'onlineMenu', update: (state) => ({ ...state, session: null, error: null }) },
      },
    },
    starting: {
      description: 'Host asked Firebase to start; waiting for confirmation.',
      on: {
        SESSION_UPDATED: { target: 'starting', update: sessionUpdated },
        STARTED: { target: 'ready', update: toReady },
        FAILED: { target: 'hostLobby', update: (state, { error }) => ({ ...state, error }) },
        GONE: { target: 'onlineMenu', update: withError('errors.sessionClosed') },
      },
    },
    joinForm: {
      description: 'Guest enters the game code and their name.',
      on: {
        SET_JOIN_CODE: {
          target: 'joinForm',
          update: (state, { value }) => ({ ...state, joinCode: normalizeCode(value), error: null }),
        },
        SET_NAME: { target: 'joinForm', update: setMyName },
        SUBMIT: {
          target: ['joining', 'joinForm'],
          update: (state) => {
            if (state.joinCode.length !== GAME_CODE_LENGTH) return { ...state, value: 'joinForm', error: 'errors.invalidCode' };
            if (!state.myName.trim()) return { ...state, value: 'joinForm', error: 'errors.nameRequired' };
            return { ...state, value: 'joining', error: null };
          },
        },
        BACK: { target: 'onlineMenu', update: clearError },
      },
    },
    joining: {
      description: 'Adding the guest to the Firebase session.',
      on: {
        JOINED: {
          target: 'guestLobby',
          update: (state, { code, playerId, settings }) => ({
            ...state,
            session: { code, playerId, isHost: false, players: [], settings },
          }),
        },
        FAILED: { target: 'joinForm', update: (state, { error }) => ({ ...state, error }) },
      },
    },
    guestLobby: {
      description: 'Guest waits for the host to start.',
      on: {
        SESSION_UPDATED: { target: 'guestLobby', update: sessionUpdated },
        STARTED: { target: 'ready', update: toReady },
        FAILED: { target: 'guestLobby', update: (state, { error }) => ({ ...state, error }) },
        GONE: { target: 'joinForm', update: (state) => ({ ...state, session: null, error: 'errors.sessionClosed' }) },
        BACK: { target: 'onlineMenu', update: (state) => ({ ...state, session: null, error: null }) },
      },
    },
    ready: {
      description: 'Setup finished; `config` describes the game to start.',
      final: true,
    },
  },
});
