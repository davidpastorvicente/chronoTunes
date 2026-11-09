import { createMachine } from './createMachine.js';

/**
 * Audio preview player. Replaces the old `isPlaying` × `isPaused` booleans
 * (four combinations, only three meaningful) and adds the missing loading,
 * ended and error states.
 *
 * Side effects (calling `audio.play()`, posting YouTube commands) are done by
 * the component; DOM media events are fed back as STARTED / ENDED / FAILED.
 */
export const createPlayer = () => ({ value: 'idle' });

export const playerMachine = createMachine({
  id: 'player',
  initial: 'idle',
  states: {
    idle: { description: 'Nothing played yet.', on: { PLAY: 'loading' } },
    loading: {
      description: 'Waiting for the media to start.',
      on: { STARTED: 'playing', FAILED: 'error', PAUSE: 'paused' },
    },
    playing: { description: 'Audio is audible.', on: { PAUSE: 'paused', ENDED: 'ended', FAILED: 'error' } },
    paused: { description: 'Paused by the user.', on: { PLAY: 'loading', FAILED: 'error' } },
    ended: { description: 'Preview finished; can replay.', on: { PLAY: 'loading' } },
    error: { description: 'Media could not be played.', on: { PLAY: 'loading' } },
  },
});
