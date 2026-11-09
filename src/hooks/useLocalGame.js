import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { createGame, gameMachine } from '../machines/gameMachine';
import { drawNextEvent } from '../game/deck';
import { loadMediaByCategory } from '../utils/mediaLoader';

const startGame = ({ playerNames, winningScore }) =>
  gameMachine.transition(createGame({ playerNames, winningScore }), { type: 'START' });

/**
 * Single-device game: the game machine runs in a local reducer. Whenever the
 * machine enters `loading`, the next item is drawn and fed back as an event.
 *
 * Returns the same shape as `useOnlineGame` so the view is mode-agnostic.
 */
export function useLocalGame(config) {
  const { category, contentSet } = config;
  const media = useMemo(() => loadMediaByCategory(category, contentSet), [category, contentSet]);
  const [game, dispatch] = useReducer(gameMachine.transition, config, startGame);

  useEffect(() => {
    if (game.value !== 'loading') return undefined;
    let cancelled = false;
    void drawNextEvent(media, game.usedItemIds).then((event) => {
      if (!cancelled) dispatch(event);
    });
    return () => {
      cancelled = true;
    };
  }, [game.value, game.usedItemIds, media]);

  const place = useCallback((position) => dispatch({ type: 'PLACE', position }), []);
  const nextTurn = useCallback(() => dispatch({ type: 'NEXT_TURN' }), []);

  return { status: 'live', game, myIndex: null, canAct: true, busy: false, error: null, place, nextTurn, retry: null };
}
