import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firebaseRoundTrip } from '../test/fixtures';
import { SessionError } from '../game/session';

/** In-memory stand-in for the Firebase Realtime Database API we use. */
function createFakeFirebase() {
  const store = new Map();
  const listeners = new Map();
  const snapshot = (path) => ({ val: () => structuredClone(store.get(path) ?? null) });
  const notify = (path) => (listeners.get(path) ?? []).forEach((cb) => cb(snapshot(path)));

  return {
    db: {},
    store,
    ref: (_db, path) => path,
    get: async (path) => snapshot(path),
    remove: async (path) => {
      store.delete(path);
      notify(path);
    },
    onValue: (path, callback) => {
      const list = listeners.get(path) ?? [];
      list.push(callback);
      listeners.set(path, list);
      callback(snapshot(path));
      return () => list.splice(list.indexOf(callback), 1);
    },
    // Like Firebase: first run against the (empty) local cache, re-run with the server value on mismatch.
    runTransaction: async (path, update) => {
      const server = store.get(path) ?? null;
      let result = update(null);
      if (result !== undefined && JSON.stringify(server) !== 'null') result = update(structuredClone(server));
      if (result === undefined) return { committed: false, snapshot: snapshot(path) };
      const stored = firebaseRoundTrip(result);
      if (stored === undefined) store.delete(path);
      else store.set(path, stored);
      notify(path);
      return { committed: true, snapshot: snapshot(path) };
    },
  };
}

let fake;
vi.mock('../firebase', () => ({ loadFirebase: async () => fake }));

const codes = [];
vi.mock('../utils/random', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, randomString: (...args) => codes.shift() ?? actual.randomString(...args) };
});

const service = await import('./gameSession');
const settings = { category: 'songs', contentSet: 'everything', winningScore: 10 };

beforeEach(() => {
  fake = createFakeFirebase();
  codes.length = 0;
});

describe('gameSession service', () => {
  it('creates a session, retrying when the code is taken', async () => {
    fake.store.set('games/TAKEN1', { settings });
    codes.push('TAKEN1', 'FREE22');
    const { code, playerId } = await service.createSession({ settings, hostName: '  Ana ' });
    expect(code).toBe('FREE22');
    expect(fake.store.get('games/TAKEN1')).toEqual({ settings });
    expect(fake.store.get('games/FREE22').players).toEqual([
      { id: playerId, name: 'Ana', score: 0, deviceId: service.getDeviceId() },
    ]);
  });

  it('joins a waiting session and rejects missing or started ones', async () => {
    codes.push('GAME01');
    await service.createSession({ settings, hostName: 'Ana' });

    await expect(service.joinSession({ code: 'NOPE00', name: 'Ben' })).rejects.toEqual(new SessionError('errors.gameNotFound'));

    const joined = await service.joinSession({ code: 'GAME01', name: 'Ben' });
    expect(joined).toMatchObject({ code: 'GAME01', settings });
    expect(fake.store.get('games/GAME01').players.map((p) => p.name)).toEqual(['Ana', 'Ben']);

    await expect(service.sendGameEvent('GAME01', { type: 'START' })).resolves.toBe(true);
    await expect(service.sendGameEvent('GAME01', { type: 'START' })).resolves.toBe(false); // already started
    await expect(service.joinSession({ code: 'GAME01', name: 'Cleo' })).rejects.toMatchObject({ code: 'errors.gameStarted' });
  });

  it('lets guests leave the lobby and the host close it', async () => {
    codes.push('GAME02');
    await service.createSession({ settings, hostName: 'Ana' });
    const { playerId } = await service.joinSession({ code: 'GAME02', name: 'Ben' });

    const onChange = vi.fn();
    const unsubscribe = service.subscribeToSession('GAME02', onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());

    await service.leaveSession('GAME02', playerId);
    expect(onChange.mock.lastCall[0].players).toHaveLength(1);

    await service.deleteSession('GAME02');
    expect(onChange.mock.lastCall[0]).toBeNull();

    unsubscribe();
    fake.store.set('games/GAME02', { settings });
    expect(onChange.mock.lastCall[0]).toBeNull();
  });

  it('does not subscribe if unsubscribed before Firebase loaded', async () => {
    const onChange = vi.fn();
    service.subscribeToSession('LATE00', onChange)();
    await Promise.resolve();
    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reuses a persistent device id', () => {
    const id = service.getDeviceId();
    expect(id).toMatch(/^device_/);
    expect(service.getDeviceId()).toBe(id);
  });
});
