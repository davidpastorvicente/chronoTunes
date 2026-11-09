import { describe, expect, it } from 'vitest';
import { createGame } from '../machines/gameMachine';
import { loadLobby, loadLocalGame, loadSavedApp, saveApp, saveLobby, saveLocalGame } from './savedGame';

const localConfig = { mode: 'local', category: 'movies', contentSet: 'everything', winningScore: 10, playerNames: ['Ana'] };
const onlineConfig = { ...localConfig, mode: 'online', gameCode: 'ABC123', playerId: 'p1', isHost: true };

describe('savedGame', () => {
  it('round-trips the app state while a game is on screen', () => {
    for (const config of [localConfig, onlineConfig]) {
      const app = { value: 'game', config, round: 2 };
      saveApp(app);
      expect(loadSavedApp()).toEqual(app);
    }
  });

  it('forgets everything when back in setup', () => {
    saveApp({ value: 'game', config: localConfig, round: 1 });
    saveLocalGame(1, createGame({ playerNames: ['Ana'], winningScore: 10 }));
    saveApp({ value: 'setup', config: null, round: 1 });
    expect(loadSavedApp()).toBeNull();
    expect(loadLocalGame(1)).toBeNull();
  });

  it('only resumes a local game from the same round', () => {
    const game = { ...createGame({ playerNames: ['Ana'], winningScore: 10 }), value: 'loading' };
    saveLocalGame(3, game);
    expect(loadLocalGame(3)).toEqual(game);
    expect(loadLocalGame(4)).toBeNull();
  });

  it('ignores corrupt or outdated data', () => {
    sessionStorage.setItem('chronotunes_app', '{not json');
    expect(loadSavedApp()).toBeNull();
    sessionStorage.setItem('chronotunes_app', JSON.stringify({ value: 'game', round: 1, config: { mode: 'online' } }));
    expect(loadSavedApp()).toBeNull();
    sessionStorage.setItem('chronotunes_local_game', JSON.stringify({ round: 1, game: { value: 'nope', players: [] } }));
    expect(loadLocalGame(1)).toBeNull();
  });

  it('round-trips the lobby session and clears it with null', () => {
    const settings = { category: 'movies', contentSet: 'everything', winningScore: 10 };
    saveLobby({ code: 'ABC123', playerId: 'p1', isHost: false, settings, players: [{ name: 'Ana' }] });
    expect(loadLobby()).toEqual({ code: 'ABC123', playerId: 'p1', isHost: false, settings });
    saveLobby(null);
    expect(loadLobby()).toBeNull();
  });

  it('ignores an invalid lobby', () => {
    sessionStorage.setItem('chronotunes_lobby', JSON.stringify({ code: 'ABC123', playerId: 'p1', isHost: true, settings: {} }));
    expect(loadLobby()).toBeNull();
  });
});
