import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appMachine, createApp } from './appMachine';
import { authMachine, createAuth } from './authMachine';
import { createPlayer, playerMachine } from './playerMachine';
import { MACHINES, renderMachineDocs } from './docs';

const run = (machine, state, ...events) => events.reduce(machine.transition, state);

describe('appMachine', () => {
  const local = { mode: 'local' };

  it('starts, restarts (single device only) and exits', () => {
    let app = run(appMachine, createApp(), { type: 'START_GAME' });
    expect(app.value).toBe('setup');

    app = run(appMachine, app, { type: 'START_GAME', config: local });
    expect(app).toMatchObject({ value: 'game', config: local, round: 1 });
    expect(run(appMachine, app, { type: 'RESTART' }).round).toBe(2);
    expect(run(appMachine, app, { type: 'EXIT' })).toMatchObject({ value: 'setup', config: null });

    const online = run(appMachine, createApp(), { type: 'START_GAME', config: { mode: 'online' } });
    expect(run(appMachine, online, { type: 'RESTART' })).toBe(online);
  });
});

describe('authMachine', () => {
  it('unlocks only with the expected password', () => {
    expect(run(authMachine, createAuth(), { type: 'SUBMIT', password: 'x', expected: 'secret' })).toMatchObject({
      value: 'locked',
      error: 'errors.wrongPassword',
    });
    expect(run(authMachine, createAuth(), { type: 'SUBMIT', password: 'x' }).error).toBe('errors.authNotConfigured');
    expect(run(authMachine, createAuth(), { type: 'SUBMIT', password: 'secret', expected: 'secret' }).value).toBe('unlocked');
    expect(createAuth(true).value).toBe('unlocked');
  });
});

describe('playerMachine', () => {
  it('covers play, pause, resume, end and error recovery', () => {
    const states = [
      { type: 'PLAY' },
      { type: 'STARTED' },
      { type: 'PAUSE' },
      { type: 'PLAY' },
      { type: 'STARTED' },
      { type: 'ENDED' },
      { type: 'PLAY' },
      { type: 'FAILED' },
      { type: 'PLAY' },
    ].reduce((acc, event) => [...acc, playerMachine.transition(acc.at(-1), event)], [createPlayer()]);
    expect(states.map((s) => s.value)).toEqual([
      'idle', 'loading', 'playing', 'paused', 'loading', 'playing', 'ended', 'loading', 'error', 'loading',
    ]);
  });
});

describe('machine docs', () => {
  it('documents every machine and is up to date (run `npm run docs:machines`)', () => {
    const committed = readFileSync(resolve(process.cwd(), 'docs/state-machines.md'), 'utf8');
    expect(committed).toBe(renderMachineDocs());
    expect(MACHINES.map((m) => m.machine.id)).toEqual(['app', 'auth', 'setup', 'game', 'player']);
  });
});
