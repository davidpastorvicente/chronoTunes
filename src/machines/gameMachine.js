import { createMachine } from './createMachine.js';
import { insertAt, isChronological, itemId, leaderIndex, nextPlayerIndex } from '../game/rules.js';

/**
 * Gameplay state machine, shared by single-device play (React `useReducer`)
 * and multi-device play (applied inside Firebase transactions).
 *
 * The state is plain JSON so it can be stored in Firebase as-is.
 *
 * @typedef {{ name: string, score: number, timeline: object[] }} Player
 * @typedef {{
 *   value: 'waiting'|'loading'|'playing'|'result'|'gameOver',
 *   winningScore: number,
 *   players: Player[],
 *   currentPlayerIndex: number,
 *   currentItem: object|null,
 *   usedItemIds: string[],
 *   lastPlacement: { playerIndex: number, position: number, correct: boolean }|null,
 *   winner: number|null,
 *   endReason: 'score'|'deckExhausted'|null,
 * }} GameState
 */

/** Creates a fresh game in the `waiting` state. */
export function createGame({ playerNames, winningScore }) {
  return {
    value: 'waiting',
    winningScore,
    players: playerNames.map((name) => ({ name, score: 0, timeline: [] })),
    currentPlayerIndex: 0,
    currentItem: null,
    usedItemIds: [],
    lastPlacement: null,
    winner: null,
    endReason: null,
  };
}

/** Events may carry `by` (player index); when present it must be the active player. */
const isActor = (state, event) => event.by == null || event.by === state.currentPlayerIndex;

function place(state, { position }) {
  const index = state.currentPlayerIndex;
  const player = state.players[index];
  const candidate = insertAt(player.timeline, position, state.currentItem);
  const correct = isChronological(candidate);
  const score = correct ? player.score + 1 : player.score;
  const won = correct && score >= state.winningScore;

  return {
    ...state,
    value: won ? 'gameOver' : 'result',
    players: state.players.map((p, i) =>
      i === index && correct ? { ...p, score, timeline: candidate } : p,
    ),
    lastPlacement: { playerIndex: index, position, correct },
    winner: won ? index : null,
    endReason: won ? 'score' : null,
  };
}

export const gameMachine = createMachine({
  id: 'game',
  initial: 'waiting',
  states: {
    waiting: {
      description: 'Lobby. Players can still join (multi-device only).',
      on: {
        START: {
          target: 'loading',
          guard: (state) => state.players.length > 0,
          description: 'Host starts the game.',
        },
      },
    },
    loading: {
      description: 'The active device is drawing and preparing the next item.',
      on: {
        ITEM_DRAWN: {
          target: 'playing',
          guard: (state, { item }) => Boolean(item) && !state.usedItemIds.includes(itemId(item)),
          update: (state, { item }) => ({
            ...state,
            currentItem: item,
            usedItemIds: [...state.usedItemIds, itemId(item)],
            lastPlacement: null,
          }),
          description: 'A fresh item was drawn from the deck.',
        },
        DECK_EXHAUSTED: {
          target: 'gameOver',
          update: (state) => ({
            ...state,
            currentItem: null,
            winner: leaderIndex(state.players),
            endReason: 'deckExhausted',
          }),
          description: 'No unused items left; the leader (if any) wins.',
        },
      },
    },
    playing: {
      description: 'The active player listens/looks and picks a position.',
      on: {
        PLACE: {
          target: ['result', 'gameOver'],
          guard: (state, event) =>
            isActor(state, event) &&
            Number.isInteger(event.position) &&
            event.position >= 0 &&
            event.position <= state.players[state.currentPlayerIndex].timeline.length,
          update: place,
          description: 'Insert the item; gameOver if it reaches the winning score.',
        },
      },
    },
    result: {
      description: 'Everyone sees whether the placement was correct.',
      on: {
        NEXT_TURN: {
          target: 'loading',
          guard: isActor,
          update: (state) => ({
            ...state,
            currentPlayerIndex: nextPlayerIndex(state.currentPlayerIndex, state.players.length),
            currentItem: null,
            lastPlacement: null,
          }),
          description: 'Pass the turn to the next player.',
        },
      },
    },
    gameOver: {
      description: 'Someone reached the winning score or the deck ran out.',
      final: true,
    },
  },
});

/** Convenience selectors. */
export const selectCurrentPlayer = (state) => state.players[state.currentPlayerIndex];
export const isFinished = (state) => state.value === 'gameOver';
