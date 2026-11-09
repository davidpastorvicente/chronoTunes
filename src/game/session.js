import { createGame, gameMachine } from '../machines/gameMachine.js';

/**
 * Pure mapping between the Firebase session document and the game machine.
 *
 * Firebase layout (`games/{code}`), kept backwards compatible:
 *   settings: { category, contentSet, winningScore }
 *   state:    { gamePhase, currentPlayerIndex, currentItem, usedItemIds,
 *               lastPlacement, winner, endReason }
 *   players:  [{ id, name, score, timeline, deviceId }]
 *   createdAt, hostDeviceId
 *
 * Firebase drops empty arrays and `null` values, so everything read back is
 * normalised here. All functions are pure so they can run inside
 * `runTransaction` (which may call them several times).
 */

export class SessionError extends Error {
  /** @param {string} code i18n key, e.g. `errors.gameNotFound` */
  constructor(code) {
    super(code);
    this.name = 'SessionError';
    this.code = code;
  }
}

const toArray = (value) => (Array.isArray(value) ? value : Object.values(value ?? {}));

export function normalizePlayers(players) {
  return toArray(players).map((p) => ({ ...p, score: p.score ?? 0, timeline: toArray(p.timeline) }));
}

export function createSessionDoc({ settings, host, now = Date.now() }) {
  return {
    settings: {
      category: settings.category,
      contentSet: settings.contentSet,
      winningScore: settings.winningScore,
    },
    state: { gamePhase: 'waiting', currentPlayerIndex: 0 },
    players: [{ id: host.id, name: host.name, score: 0, timeline: [], deviceId: host.deviceId }],
    createdAt: now,
    hostDeviceId: host.deviceId,
  };
}

export function sessionToGame(doc) {
  const state = doc.state ?? {};
  return {
    ...createGame({ playerNames: [], winningScore: doc.settings.winningScore }),
    value: state.gamePhase ?? 'waiting',
    players: normalizePlayers(doc.players),
    currentPlayerIndex: state.currentPlayerIndex ?? 0,
    currentItem: state.currentItem ?? null,
    usedItemIds: toArray(state.usedItemIds),
    lastPlacement: state.lastPlacement ?? null,
    winner: state.winner ?? null,
    endReason: state.endReason ?? null,
  };
}

export function gameToSession(doc, game) {
  return {
    ...doc,
    state: {
      gamePhase: game.value,
      currentPlayerIndex: game.currentPlayerIndex,
      currentItem: game.currentItem,
      usedItemIds: game.usedItemIds,
      lastPlacement: game.lastPlacement,
      winner: game.winner,
      endReason: game.endReason,
    },
    // Keep per-player metadata (id, deviceId) and only overwrite game fields.
    players: normalizePlayers(doc.players).map((p, i) => ({
      ...p,
      name: game.players[i].name,
      score: game.players[i].score,
      timeline: game.players[i].timeline,
    })),
  };
}

/**
 * Applies a game machine event to a session document.
 * @returns the new document, or `undefined` if the event was ignored.
 */
export function applySessionEvent(doc, event) {
  if (!doc) return undefined;
  const game = sessionToGame(doc);
  const next = gameMachine.transition(game, event);
  return next === game ? undefined : gameToSession(doc, next);
}

export function addPlayer(doc, player) {
  if (!doc) throw new SessionError('errors.gameNotFound');
  if ((doc.state?.gamePhase ?? 'waiting') !== 'waiting') throw new SessionError('errors.gameStarted');
  return {
    ...doc,
    players: [...normalizePlayers(doc.players), { ...player, score: 0, timeline: [] }],
  };
}

export function removePlayer(doc, playerId) {
  if (!doc || doc.state?.gamePhase !== 'waiting') return undefined;
  return { ...doc, players: normalizePlayers(doc.players).filter((p) => p.id !== playerId) };
}

export function playerIndexOf(doc, playerId) {
  return normalizePlayers(doc?.players).findIndex((p) => p.id === playerId);
}
