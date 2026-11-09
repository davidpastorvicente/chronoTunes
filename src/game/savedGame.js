import { gameMachine } from '../machines/gameMachine.js';
import { GAME_CODE_LENGTH, sanitizeSettings } from '../machines/setupMachine.js';

/**
 * Keeps the game in progress across page reloads. Stored in `sessionStorage`,
 * so it survives a refresh but each tab keeps its own game (handy when
 * testing multi-device play with several tabs).
 *
 * - The app state (`appMachine`) says which game is on screen; for
 *   multi-device games that is enough, Firebase holds the rest.
 * - Single-device games also store the game machine state, tagged with the
 *   app `round` so RESTART / a new game never resumes an old one.
 * - In a multi-device lobby (before the game starts) the session we created
 *   or joined is stored, so a reload reopens the same lobby instead of
 *   leaving an abandoned game or a duplicate player behind.
 */
const APP_KEY = 'chronotunes_app';
const LOCAL_GAME_KEY = 'chronotunes_local_game';
const LOBBY_KEY = 'chronotunes_lobby';

function read(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private mode): the game just won't survive a reload.
  }
}

const isObject = (value) => typeof value === 'object' && value !== null;

function isValidConfig(config) {
  if (!isObject(config) || typeof config.category !== 'string' || !Array.isArray(config.playerNames)) return false;
  if (config.mode === 'local') return true;
  return config.mode === 'online' && typeof config.gameCode === 'string' && typeof config.playerId === 'string';
}

/** The saved app state if a game was on screen, otherwise `null`. */
export function loadSavedApp() {
  const app = read(APP_KEY);
  if (!isObject(app) || app.value !== 'game' || !Number.isInteger(app.round) || !isValidConfig(app.config)) return null;
  return app;
}

/** Saves the app state while a game is on screen; clears everything otherwise. */
export function saveApp(app) {
  if (app.value === 'game') {
    write(APP_KEY, app);
  } else {
    write(APP_KEY, null);
    write(LOCAL_GAME_KEY, null);
  }
}

/** The saved single-device game for `round`, or `null`. */
export function loadLocalGame(round) {
  const saved = read(LOCAL_GAME_KEY);
  if (!Number.isInteger(round) || !isObject(saved) || saved.round !== round) return null;
  const { game } = saved;
  const valid =
    isObject(game) &&
    Object.hasOwn(gameMachine.definition.states, game.value) &&
    Array.isArray(game.players) &&
    game.players.length > 0 &&
    Array.isArray(game.usedItemIds);
  return valid ? game : null;
}

export function saveLocalGame(round, game) {
  write(LOCAL_GAME_KEY, { round, game });
}

/** The saved lobby session (`{ code, playerId, isHost, settings }`), or `null`. */
export function loadLobby() {
  const lobby = read(LOBBY_KEY);
  if (!isObject(lobby)) return null;
  const { code, playerId, isHost } = lobby;
  const settings = sanitizeSettings(lobby.settings);
  const valid =
    typeof code === 'string' &&
    code.length === GAME_CODE_LENGTH &&
    typeof playerId === 'string' &&
    typeof isHost === 'boolean' &&
    ['category', 'contentSet', 'winningScore'].every((key) => key in settings);
  return valid ? { code, playerId, isHost, settings } : null;
}

/** Saves the lobby session, or clears it with `null`. */
export function saveLobby(session) {
  write(LOBBY_KEY, session && {
    code: session.code,
    playerId: session.playerId,
    isHost: session.isHost,
    settings: session.settings,
  });
}
