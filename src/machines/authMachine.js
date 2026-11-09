import { createMachine } from './createMachine.js';

/**
 * Password gate. The expected password is passed in the SUBMIT event so the
 * machine stays pure (no `import.meta.env` access here).
 */
export const createAuth = (unlocked = false) => ({ value: unlocked ? 'unlocked' : 'locked', error: null });

export const authMachine = createMachine({
  id: 'auth',
  initial: 'locked',
  states: {
    locked: {
      description: 'Waiting for the password.',
      on: {
        SUBMIT: {
          target: ['unlocked', 'locked'],
          update: (state, { password, expected }) => {
            if (!expected) return { ...state, value: 'locked', error: 'errors.authNotConfigured' };
            if (password === expected) return { ...state, value: 'unlocked', error: null };
            return { ...state, value: 'locked', error: 'errors.wrongPassword' };
          },
        },
      },
    },
    unlocked: { description: 'Access granted for this browser session.', final: true },
  },
});
