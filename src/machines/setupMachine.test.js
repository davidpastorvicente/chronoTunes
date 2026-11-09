import { describe, expect, it } from 'vitest';
import { createSetup, DEFAULT_SETTINGS, normalizeCode, sanitizeSettings, setupMachine } from './setupMachine';

const run = (state, ...events) => events.reduce(setupMachine.transition, state);
const players = (...names) => names.map((name, i) => ({ id: `p${i}`, name }));

describe('setupMachine', () => {
  it('configures and starts a single-device game', () => {
    const state = run(
      createSetup(),
      { type: 'CHOOSE_LOCAL' },
      { type: 'SET_PLAYER_COUNT', count: 3 },
      { type: 'SET_PLAYER_NAME', index: 2, name: 'Cleo' },
      { type: 'UPDATE_SETTINGS', patch: { category: 'movies', winningScore: 5 } },
    );
    expect(state.value).toBe('localSetup');
    expect(state.settings.playerNames).toEqual(['', '', 'Cleo']);

    const ready = run(state, { type: 'START', playerNames: ['A', 'B', 'Cleo'] });
    expect(ready).toMatchObject({
      value: 'ready',
      config: { mode: 'local', category: 'movies', contentSet: 'everything', winningScore: 5, playerNames: ['A', 'B', 'Cleo'] },
    });
  });

  it('rejects invalid player counts', () => {
    const state = run(createSetup(), { type: 'CHOOSE_LOCAL' });
    expect(run(state, { type: 'SET_PLAYER_COUNT', count: 0 })).toBe(state);
    expect(run(state, { type: 'SET_PLAYER_COUNT', count: 7 })).toBe(state);
  });

  it('hosts a game through create → lobby → start', () => {
    let state = run(createSetup(), { type: 'CHOOSE_ONLINE' }, { type: 'HOST' }, { type: 'SUBMIT' });
    expect(state).toMatchObject({ value: 'hostSetup', error: 'errors.nameRequired' });

    state = run(state, { type: 'SET_NAME', value: 'Ana' }, { type: 'SUBMIT' });
    expect(state.value).toBe('creating');
    expect(run(state, { type: 'BACK' })).toBe(state); // can't leave mid-request

    state = run(state, { type: 'CREATED', code: 'ABC123', playerId: 'p0' });
    expect(state.session).toMatchObject({ code: 'ABC123', isHost: true });

    state = run(state, { type: 'SESSION_UPDATED', players: players('Ana') }, { type: 'START' });
    expect(state).toMatchObject({ value: 'hostLobby', error: 'errors.notEnoughPlayers' });

    state = run(state, { type: 'SESSION_UPDATED', players: players('Ana', 'Ben') }, { type: 'START' });
    expect(state.value).toBe('starting');

    state = run(state, { type: 'STARTED', players: players('Ana', 'Ben') });
    expect(state.config).toEqual({
      mode: 'online',
      ...DEFAULT_SETTINGS,
      gameCode: 'ABC123',
      playerId: 'p0',
      isHost: true,
      playerNames: ['Ana', 'Ben'],
    });
  });

  it('returns to the host form with the error when creation fails', () => {
    const state = run(createSetup({ myName: 'Ana' }), { type: 'CHOOSE_ONLINE' }, { type: 'HOST' }, { type: 'SUBMIT' }, { type: 'FAILED', error: 'errors.network' });
    expect(state).toMatchObject({ value: 'hostSetup', error: 'errors.network' });
  });

  it('validates and joins a game, then follows the host', () => {
    let state = run(createSetup(), { type: 'CHOOSE_ONLINE' }, { type: 'JOIN' }, { type: 'SET_JOIN_CODE', value: 'ab-1' }, { type: 'SUBMIT' });
    expect(state).toMatchObject({ value: 'joinForm', joinCode: 'AB1', error: 'errors.invalidCode' });

    state = run(state, { type: 'SET_JOIN_CODE', value: 'abc123' }, { type: 'SUBMIT' });
    expect(state.error).toBe('errors.nameRequired');

    state = run(state, { type: 'SET_NAME', value: 'Ben' }, { type: 'SUBMIT' });
    expect(state.value).toBe('joining');

    const settings = { category: 'shows', contentSet: 'new', winningScore: 15 };
    state = run(state, { type: 'JOINED', code: 'ABC123', playerId: 'p1', settings });
    expect(state.value).toBe('guestLobby');

    const ready = run(state, { type: 'STARTED', players: players('Ana', 'Ben'), settings });
    expect(ready.config).toMatchObject({ mode: 'online', ...settings, isHost: false, playerId: 'p1' });

    const closed = run(state, { type: 'GONE' });
    expect(closed).toMatchObject({ value: 'joinForm', error: 'errors.sessionClosed', session: null });

    // Subscription errors are surfaced instead of being dropped.
    expect(run(state, { type: 'FAILED', error: 'errors.network' })).toMatchObject({ value: 'guestLobby', error: 'errors.network' });
  });

  it('opens the join form directly from an invite link', () => {
    expect(createSetup({ joinCode: 'abc123' })).toMatchObject({ value: 'joinForm', joinCode: 'ABC123' });
  });

  it('reopens a saved lobby after a reload', () => {
    const session = { code: 'ABC123', playerId: 'p1', settings: { category: 'movies', contentSet: 'everything', winningScore: 10 } };
    expect(createSetup({ session: { ...session, isHost: true } })).toMatchObject({
      value: 'hostLobby',
      session: { ...session, isHost: true, players: [] },
    });
    const guest = createSetup({ session: { ...session, isHost: false } });
    expect(guest.value).toBe('guestLobby');
    expect(run(guest, { type: 'STARTED', players: [{ name: 'Ana' }, { name: 'Ben' }] }).config).toMatchObject({
      mode: 'online',
      gameCode: 'ABC123',
      playerId: 'p1',
      playerNames: ['Ana', 'Ben'],
    });
  });

  it('navigates back step by step', () => {
    const state = run(createSetup(), { type: 'CHOOSE_ONLINE' }, { type: 'JOIN' }, { type: 'BACK' }, { type: 'BACK' });
    expect(state.value).toBe('chooseMode');
    expect(setupMachine.can(state, 'BACK')).toBe(false);
  });
});

describe('HOME', () => {
  it('returns to the mode selection from any step that can leave', () => {
    const steps = [
      [{ type: 'CHOOSE_LOCAL' }],
      [{ type: 'CHOOSE_ONLINE' }],
      [{ type: 'CHOOSE_ONLINE' }, { type: 'HOST' }],
      [{ type: 'CHOOSE_ONLINE' }, { type: 'JOIN' }],
      [{ type: 'CHOOSE_ONLINE' }, { type: 'HOST' }, { type: 'SET_NAME', value: 'Ana' }, { type: 'SUBMIT' }, { type: 'CREATED', code: 'ABC123', playerId: 'p0' }],
    ];
    for (const events of steps) {
      const state = run(createSetup(), ...events, { type: 'HOME' });
      expect(state).toMatchObject({ value: 'chooseMode', session: null, error: null });
    }
  });

  it('is ignored on the first step and while a request is in flight', () => {
    const initial = createSetup();
    expect(run(initial, { type: 'HOME' })).toBe(initial);
    const creating = run(initial, { type: 'CHOOSE_ONLINE' }, { type: 'HOST' }, { type: 'SET_NAME', value: 'Ana' }, { type: 'SUBMIT' });
    expect(run(creating, { type: 'HOME' })).toBe(creating);
  });
});

describe('normalizeCode', () => {
  it('uppercases, strips separators and truncates', () => {
    expect(normalizeCode(' ab-c 12 3x ')).toBe('ABC123');
    expect(normalizeCode()).toBe('');
  });
});

describe('sanitizeSettings', () => {
  it('keeps valid values and drops everything else', () => {
    expect(sanitizeSettings({ category: 'movies', contentSet: 'bogus', winningScore: 15, playerNames: ['A', 'B'] })).toEqual({
      category: 'movies',
      winningScore: 15,
      playerNames: ['A', 'B'],
    });
    expect(sanitizeSettings({ playerNames: [] })).toEqual({});
    expect(sanitizeSettings({ playerNames: [1] })).toEqual({});
    expect(sanitizeSettings(null)).toEqual({});
    expect(sanitizeSettings({ playerNames: ['x'.repeat(50)] }).playerNames[0]).toHaveLength(20);
  });
});
