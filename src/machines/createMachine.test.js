import { describe, expect, it } from 'vitest';
import { createMachine, toMermaid } from './createMachine';

const toggle = createMachine({
  id: 'toggle',
  initial: 'off',
  states: {
    off: {
      on: {
        TURN_ON: { target: 'on', guard: (_, event) => !event.blocked },
        SET: {
          target: ['on', 'off'],
          update: (state, { to }) => (to === 'nowhere' ? { ...state, value: 'nowhere' } : { ...state, value: to }),
        },
        REJECT: { target: 'on', update: () => null },
      },
    },
    on: { on: { TURN_OFF: 'off' }, final: true },
  },
});

describe('createMachine', () => {
  it('moves to a single target and keeps context', () => {
    expect(toggle.transition({ value: 'off', n: 1 }, { type: 'TURN_ON' })).toEqual({ value: 'on', n: 1 });
  });

  it('returns the same object for unknown events, failed guards or rejected updates', () => {
    const state = { value: 'off' };
    expect(toggle.transition(state, { type: 'NOPE' })).toBe(state);
    expect(toggle.transition(state, { type: 'TURN_ON', blocked: true })).toBe(state);
    expect(toggle.transition(state, { type: 'REJECT' })).toBe(state);
    expect(toggle.can(state, 'TURN_ON')).toBe(true);
    expect(toggle.can(state, { type: 'TURN_ON', blocked: true })).toBe(false);
  });

  it('lets update pick among declared targets only', () => {
    expect(toggle.transition({ value: 'off' }, { type: 'SET', to: 'on' }).value).toBe('on');
    expect(() => toggle.transition({ value: 'off' }, { type: 'SET', to: 'nowhere' })).toThrow(/not a declared target/);
  });

  it('validates the definition eagerly', () => {
    expect(() => createMachine({ id: 'x', initial: 'missing', states: {} })).toThrow(/initial state/);
    expect(() => createMachine({ id: 'x', initial: 'a', states: { a: { on: { GO: 'b' } } } })).toThrow(/unknown state/);
  });

  it('exposes events, edges and a Mermaid diagram', () => {
    expect(toggle.events('off')).toEqual(['TURN_ON', 'SET', 'REJECT']);
    expect(toggle.edges()).toContainEqual({ from: 'on', to: 'off', type: 'TURN_OFF', description: undefined });
    expect(toMermaid(toggle)).toContain('off --> on: TURN_ON');
    expect(toMermaid(toggle)).toContain('on --> [*]');
  });
});
