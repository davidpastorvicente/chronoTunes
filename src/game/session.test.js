import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  applySessionEvent,
  createSessionDoc,
  gameToSession,
  normalizePlayers,
  playerIndexOf,
  removePlayer,
  SessionError,
  sessionToGame,
} from './session';
import { firebaseRoundTrip, song } from '../test/fixtures';

const settings = { category: 'songs', contentSet: 'everything', winningScore: 2 };
const host = { id: 'host', name: 'Ana', deviceId: 'dev-a' };
const guest = { id: 'guest', name: 'Ben', deviceId: 'dev-b' };

/** Applies an event the way Firebase would store and return it. */
const send = (doc, event) => {
  const next = applySessionEvent(doc, event);
  return next === undefined ? undefined : firebaseRoundTrip(next);
};

describe('session documents', () => {
  it('creates a waiting session with the host as first player', () => {
    const doc = createSessionDoc({ settings: { ...settings, extra: 'ignored' }, host, now: 1 });
    expect(doc).toEqual({
      settings,
      state: { gamePhase: 'waiting', currentPlayerIndex: 0 },
      players: [{ id: 'host', name: 'Ana', score: 0, timeline: [], deviceId: 'dev-a' }],
      createdAt: 1,
      hostDeviceId: 'dev-a',
    });
  });

  it('normalises what Firebase returns (missing arrays, object-shaped arrays)', () => {
    const stored = firebaseRoundTrip(createSessionDoc({ settings, host }));
    expect(stored.players[0].timeline).toBeUndefined();
    expect(normalizePlayers({ 0: { name: 'A' } })).toEqual([{ name: 'A', score: 0, timeline: [] }]);
    expect(sessionToGame(stored)).toMatchObject({
      value: 'waiting',
      players: [{ name: 'Ana', score: 0, timeline: [] }],
      usedItemIds: [],
      currentItem: null,
      winner: null,
    });
  });

  it('keeps player metadata when writing game state back', () => {
    const doc = createSessionDoc({ settings, host });
    const game = { ...sessionToGame(doc), players: [{ name: 'Ana', score: 3, timeline: [song(1990)] }] };
    expect(gameToSession(doc, game).players[0]).toMatchObject({ id: 'host', deviceId: 'dev-a', score: 3 });
  });

  it('plays a whole online game through Firebase-like round trips', () => {
    let doc = firebaseRoundTrip(addPlayer(createSessionDoc({ settings, host }), guest));
    doc = send(doc, { type: 'START' });
    doc = send(doc, { type: 'ITEM_DRAWN', item: song(1990) });
    expect(send(doc, { type: 'PLACE', position: 0, by: 1 })).toBeUndefined(); // not Ben's turn
    doc = send(doc, { type: 'PLACE', position: 0, by: 0 });
    expect(doc.state).toMatchObject({ gamePhase: 'result', lastPlacement: { correct: true } });
    doc = send(doc, { type: 'NEXT_TURN', by: 0 });
    expect(doc.state).toMatchObject({ gamePhase: 'loading', currentPlayerIndex: 1 });
    expect(doc.state.currentItem).toBeUndefined();
    doc = send(doc, { type: 'ITEM_DRAWN', item: song(2000) });
    doc = send(doc, { type: 'PLACE', position: 0, by: 1 });
    doc = send(doc, { type: 'NEXT_TURN', by: 1 });
    doc = send(doc, { type: 'ITEM_DRAWN', item: song(2010) });
    doc = send(doc, { type: 'PLACE', position: 1, by: 0 });

    expect(doc.state).toMatchObject({ gamePhase: 'gameOver', winner: 0, endReason: 'score' });
    expect(doc.players[0]).toMatchObject({ id: 'host', score: 2 });
    expect(doc.players[0].timeline.map((i) => i.year)).toEqual([1990, 2010]);
    expect(doc.state.usedItemIds).toEqual(['song:yt1990', 'song:yt2000', 'song:yt2010']);
  });

  it('ignores events for missing sessions', () => {
    expect(applySessionEvent(null, { type: 'START' })).toBeUndefined();
  });
});

describe('lobby membership', () => {
  const lobby = createSessionDoc({ settings, host });

  it('adds players only while waiting', () => {
    expect(addPlayer(lobby, guest).players.map((p) => p.id)).toEqual(['host', 'guest']);
    expect(() => addPlayer(null, guest)).toThrow(SessionError);
    const started = { ...lobby, state: { gamePhase: 'loading' } };
    expect(() => addPlayer(started, guest)).toThrow(expect.objectContaining({ code: 'errors.gameStarted' }));
  });

  it('removes players only while waiting, and finds players by id', () => {
    const full = addPlayer(lobby, guest);
    expect(playerIndexOf(full, 'guest')).toBe(1);
    expect(removePlayer(full, 'guest').players).toHaveLength(1);
    expect(removePlayer({ ...full, state: { gamePhase: 'playing' } }, 'guest')).toBeUndefined();
    expect(playerIndexOf(null, 'guest')).toBe(-1);
  });
});
