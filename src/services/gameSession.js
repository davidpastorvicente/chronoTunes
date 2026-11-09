import { loadFirebase } from '../firebase';
import { addPlayer, applySessionEvent, createSessionDoc, removePlayer, SessionError } from '../game/session';
import { randomId, randomString } from '../utils/random';

/**
 * Firebase-backed multi-device sessions (`games/{code}`).
 *
 * Every write goes through `runTransaction` with a pure function from
 * `game/session.js`, so concurrent joins/moves can't overwrite each other and
 * stale or duplicate events (double clicks, two devices) are rejected by the
 * game state machine instead of corrupting the game.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const MAX_CODE_ATTEMPTS = 5;
const DEVICE_ID_KEY = 'chronotunes_device_id';

export const generateGameCode = () => randomString(6, CODE_ALPHABET);

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${randomId()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

async function gameRef(code) {
  const firebase = await loadFirebase();
  return { firebase, ref: firebase.ref(firebase.db, `games/${code}`) };
}

/**
 * Runs `update(doc)` atomically; returns the committed doc or `null` if
 * aborted. Firebase may first call the handler with an empty local cache
 * (`null`); unless we are creating the node we answer `null`, which makes the
 * server re-run the handler with the real value (or no-op if it is missing).
 */
async function transact(code, update, { create = false } = {}) {
  const { firebase, ref } = await gameRef(code);
  let failure = null;
  const result = await firebase.runTransaction(ref, (doc) => {
    failure = null;
    if (doc === null && !create) return null;
    try {
      return update(doc);
    } catch (error) {
      failure = error;
      return undefined; // abort
    }
  });
  if (failure) throw failure;
  return result.committed ? result.snapshot.val() : null;
}

/**
 * Creates a session with the host as the first player.
 * @returns {Promise<{ code: string, playerId: string }>}
 */
export async function createSession({ settings, hostName }) {
  const host = { id: randomId(), name: hostName.trim(), deviceId: getDeviceId() };
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateGameCode();
    // Abort if the code is already taken, then retry with a new one.
    const created = await transact(code, (doc) => (doc ? undefined : createSessionDoc({ settings, host })), {
      create: true,
    });
    if (created) return { code, playerId: host.id };
  }
  throw new SessionError('errors.network');
}

/**
 * Adds a player to a session that hasn't started yet.
 * @returns {Promise<{ code: string, playerId: string, settings: object }>}
 */
export async function joinSession({ code, name }) {
  const player = { id: randomId(), name: name.trim(), deviceId: getDeviceId() };
  const { firebase, ref } = await gameRef(code);
  // Fast, friendly validation; the transaction below re-checks atomically.
  addPlayer((await firebase.get(ref)).val(), player);
  const doc = await transact(code, (current) => addPlayer(current, player));
  if (!doc) throw new SessionError('errors.gameNotFound');
  return { code, playerId: player.id, settings: doc.settings };
}

/** Removes a player from a session that hasn't started yet. */
export async function leaveSession(code, playerId) {
  await transact(code, (doc) => removePlayer(doc, playerId));
}

export async function deleteSession(code) {
  const { firebase, ref } = await gameRef(code);
  await firebase.remove(ref);
}

/**
 * Sends a game machine event (START, ITEM_DRAWN, PLACE, NEXT_TURN, …).
 * @returns {Promise<boolean>} whether the event was accepted.
 */
export async function sendGameEvent(code, event) {
  return Boolean(await transact(code, (doc) => applySessionEvent(doc, event)));
}

/**
 * Subscribes to a session. `onChange` receives the document, or `null` when
 * it no longer exists (e.g. the host left).
 * @returns {() => void} unsubscribe
 */
export function subscribeToSession(code, onChange, onError = console.error) {
  let unsubscribe = null;
  let cancelled = false;
  gameRef(code)
    .then(({ firebase, ref }) => {
      if (cancelled) return;
      unsubscribe = firebase.onValue(ref, (snapshot) => onChange(snapshot.val()), onError);
    })
    .catch(onError);
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
