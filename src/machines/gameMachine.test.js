import { describe, expect, it } from 'vitest';
import { createGame, gameMachine, isFinished, selectCurrentPlayer } from './gameMachine';
import { song } from '../test/fixtures';

const run = (state, ...events) => events.reduce(gameMachine.transition, state);
const start = (playerNames = ['Ana', 'Ben'], winningScore = 2) =>
  run(createGame({ playerNames, winningScore }), { type: 'START' });

describe('gameMachine', () => {
  it('starts in waiting and moves to loading on START', () => {
    const game = createGame({ playerNames: ['Ana'], winningScore: 5 });
    expect(game.value).toBe('waiting');
    expect(run(game, { type: 'START' }).value).toBe('loading');
    expect(run(createGame({ playerNames: [], winningScore: 5 }), { type: 'START' }).value).toBe('waiting');
  });

  it('plays a full correct turn and passes the turn', () => {
    let game = run(start(), { type: 'ITEM_DRAWN', item: song(1990) });
    expect(game).toMatchObject({ value: 'playing', usedItemIds: ['song:yt1990'] });

    game = run(game, { type: 'PLACE', position: 0 });
    expect(game.value).toBe('result');
    expect(game.lastPlacement).toEqual({ playerIndex: 0, position: 0, correct: true });
    expect(selectCurrentPlayer(game)).toMatchObject({ name: 'Ana', score: 1 });

    game = run(game, { type: 'NEXT_TURN' });
    expect(game).toMatchObject({ value: 'loading', currentPlayerIndex: 1, currentItem: null, lastPlacement: null });
  });

  it('does not add a wrongly placed item', () => {
    let game = start();
    game.players[0].timeline = [song(2000)];
    game = run(game, { type: 'ITEM_DRAWN', item: song(2010) }, { type: 'PLACE', position: 0 });
    expect(game.lastPlacement.correct).toBe(false);
    expect(game.players[0]).toMatchObject({ score: 0, timeline: [song(2000)] });
  });

  it('ends the game when a player reaches the winning score', () => {
    let game = start(['Ana', 'Ben'], 1);
    game = run(game, { type: 'ITEM_DRAWN', item: song(1990) }, { type: 'PLACE', position: 0 });
    expect(game).toMatchObject({ value: 'gameOver', winner: 0, endReason: 'score' });
    expect(isFinished(game)).toBe(true);
    expect(gameMachine.events('gameOver')).toEqual([]);
  });

  it('ends with the leader (or a tie) when the deck runs out', () => {
    const game = start();
    expect(run(game, { type: 'DECK_EXHAUSTED' })).toMatchObject({ value: 'gameOver', winner: null, endReason: 'deckExhausted' });
    game.players[1].score = 1;
    expect(run(game, { type: 'DECK_EXHAUSTED' }).winner).toBe(1);
  });

  it('ignores duplicate and out-of-turn events (idempotent under double clicks / stale devices)', () => {
    const playing = run(start(), { type: 'ITEM_DRAWN', item: song(1990) });
    expect(run(playing, { type: 'ITEM_DRAWN', item: song(1991) })).toBe(playing);
    expect(run(playing, { type: 'PLACE', position: 0, by: 1 })).toBe(playing);
    expect(run(playing, { type: 'PLACE', position: 5 })).toBe(playing);
    expect(run(playing, { type: 'PLACE', position: -1 })).toBe(playing);
    expect(run(playing, { type: 'NEXT_TURN' })).toBe(playing);

    const result = run(playing, { type: 'PLACE', position: 0, by: 0 });
    expect(run(result, { type: 'PLACE', position: 0 })).toBe(result);
    expect(run(result, { type: 'NEXT_TURN', by: 1 })).toBe(result);
  });

  it('never draws the same item twice', () => {
    const game = run(start(), { type: 'ITEM_DRAWN', item: song(1990) }, { type: 'PLACE', position: 0 }, { type: 'NEXT_TURN' });
    expect(run(game, { type: 'ITEM_DRAWN', item: song(1990) })).toBe(game);
    expect(run(game, { type: 'ITEM_DRAWN', item: null })).toBe(game);
  });
});
