import { createMachine } from './createMachine.js';

/**
 * Top-level screen flow: setup wizard → game → (back to setup | replay).
 * `round` increments on RESTART so the game screen remounts with a fresh deck.
 */
export const createApp = () => ({ value: 'setup', config: null, round: 0 });

export const appMachine = createMachine({
  id: 'app',
  initial: 'setup',
  states: {
    setup: {
      description: 'Choosing mode and settings.',
      on: {
        START_GAME: {
          target: 'game',
          guard: (_, { config }) => Boolean(config),
          update: (state, { config }) => ({ ...state, config, round: state.round + 1 }),
        },
      },
    },
    game: {
      description: 'A game is in progress (or just finished).',
      on: {
        RESTART: {
          target: 'game',
          guard: (state) => state.config.mode === 'local',
          update: (state) => ({ ...state, round: state.round + 1 }),
          description: 'Play again with the same settings (single device).',
        },
        EXIT: { target: 'setup', update: (state) => ({ ...state, config: null }) },
      },
    },
  },
});
