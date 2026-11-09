import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { drawNextEvent } from '../game/deck';
import { playerIndexOf, sessionToGame, SessionError } from '../game/session';
import { sendGameEvent, subscribeToSession } from '../services/gameSession';
import { loadMediaByCategory } from '../utils/mediaLoader';

/**
 * Multi-device game: the game machine state lives in Firebase and every move
 * is applied with a transaction (see `services/gameSession.js`).
 *
 * The device whose turn it is acts as the "driver": it places, advances the
 * turn and draws the next item. Other devices only render.
 *
 * status: 'connecting' → 'live' → 'closed' (session deleted)
 */
export function useOnlineGame(config) {
  const { gameCode, playerId, category, contentSet } = config;
  const media = useMemo(() => loadMediaByCategory(category, contentSet), [category, contentSet]);
  const [doc, setDoc] = useState(undefined); // undefined = connecting, null = gone
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const drawingFor = useRef(null);

  useEffect(
    () => subscribeToSession(gameCode, setDoc, (err) => setError(err instanceof SessionError ? err.code : 'errors.network')),
    [gameCode],
  );

  const game = useMemo(() => (doc ? sessionToGame(doc) : null), [doc]);
  const myIndex = doc ? playerIndexOf(doc, playerId) : -1;
  const canAct = Boolean(game) && myIndex >= 0 && game.currentPlayerIndex === myIndex;

  /** Sends an event; resolves to whether Firebase accepted it. */
  const run = useCallback(
    async (event) => {
      setBusy(true);
      setError(null);
      try {
        return await sendGameEvent(gameCode, event);
      } catch (err) {
        console.error(err);
        setError('errors.network');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [gameCode],
  );

  // Driver: draw the next item when it's this device's turn to do so. If the
  // draw is rejected (e.g. the session changed meanwhile) surface an error so
  // "Try again" can re-draw instead of leaving the game stuck in `loading`.
  const drawKey = game?.value === 'loading' && canAct ? `${game.currentPlayerIndex}:${game.usedItemIds.length}:${attempt}` : null;
  useEffect(() => {
    if (!drawKey || drawingFor.current === drawKey) return;
    drawingFor.current = drawKey;
    void drawNextEvent(media, game.usedItemIds)
      .then(run)
      .then((accepted) => accepted || setError('errors.network'));
  }, [drawKey, media, game, run]);

  const place = useCallback((position) => run({ type: 'PLACE', position, by: myIndex }), [run, myIndex]);
  const nextTurn = useCallback(() => run({ type: 'NEXT_TURN', by: myIndex }), [run, myIndex]);
  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  let status = 'live';
  if (doc === undefined) status = 'connecting';
  else if (doc === null) status = 'closed';

  return { status, game, myIndex, canAct, busy, error, place, nextTurn, retry };
}
