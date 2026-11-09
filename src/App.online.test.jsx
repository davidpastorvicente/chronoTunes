import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createSessionDoc, addPlayer, applySessionEvent } from './game/session';
import { movie } from './test/fixtures';

/**
 * Multi-device flows against a mocked session service. One in-memory
 * document plays the role of Firebase; `push` simulates remote updates.
 */
const remote = vi.hoisted(() => ({ doc: null, listeners: new Set() }));
const push = (doc) => act(() => {
  remote.doc = doc;
  remote.listeners.forEach((listener) => listener(doc));
});

vi.mock('./firebase', () => ({ isFirebaseConfigured: () => true }));
vi.mock('./utils/mediaLoader', () => ({ loadMediaByCategory: () => [movie(1990, '1'), movie(2000, '2')] }));
vi.mock('./utils/random', async (importOriginal) => ({ ...(await importOriginal()), randomItem: (items) => items[0] }));
vi.mock('./services/gameSession', () => ({
  createSession: vi.fn(async ({ settings, hostName }) => {
    remote.doc = createSessionDoc({ settings, host: { id: 'host', name: hostName, deviceId: 'd1' } });
    return { code: 'ABC123', playerId: 'host' };
  }),
  joinSession: vi.fn(async ({ code, name }) => {
    if (code !== 'ABC123') throw Object.assign(new Error('x'), { name: 'SessionError' });
    remote.doc = addPlayer(remote.doc, { id: 'guest', name, deviceId: 'd2' });
    return { code, playerId: 'guest', settings: remote.doc.settings };
  }),
  leaveSession: vi.fn(async () => {}),
  deleteSession: vi.fn(async () => {}),
  sendGameEvent: vi.fn(async (_code, event) => {
    const next = applySessionEvent(remote.doc, event);
    if (next) await push(next);
    return Boolean(next);
  }),
  subscribeToSession: (_code, onChange) => {
    remote.listeners.add(onChange);
    queueMicrotask(() => onChange(remote.doc));
    return () => remote.listeners.delete(onChange);
  },
}));

const services = await import('./services/gameSession');
const main = () => document.querySelector('main');
const settings = { category: 'movies', contentSet: 'everything', winningScore: 10 };

beforeEach(() => {
  vi.stubEnv('VITE_DISABLE_AUTH', 'true');
  localStorage.setItem('chronotunes_language', 'en');
  remote.doc = null;
  remote.listeners.clear();
});

describe('multi-device (integration, mocked Firebase)', () => {
  it('hosts a game, waits for a guest, starts and plays the first turn', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /multiple devices/i }));
    await user.click(screen.getByRole('button', { name: /host a game/i }));
    await user.click(screen.getByRole('button', { name: 'Create game' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your name');

    await user.type(screen.getByLabelText('Your name'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Create game' }));
    expect(await screen.findByText('ABC123')).toBeInTheDocument();
    expect(main()).toHaveAttribute('data-step', 'hostLobby');
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();

    await push(addPlayer(remote.doc, { id: 'guest', name: 'Ben', deviceId: 'd2' }));
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Start game' }));

    // The host is player 0, so this device draws the first item and places it.
    expect(await screen.findByText('Your turn')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Place as first item' }));
    expect(services.sendGameEvent).toHaveBeenLastCalledWith('ABC123', { type: 'PLACE', position: 0, by: 0 });
    expect(await screen.findByText('Correct!')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next turn/i }));
    // Ben's device is now the driver; this device only renders.
    expect(await screen.findByText('Preparing the next item…')).toBeInTheDocument();
    await push(applySessionEvent(remote.doc, { type: 'ITEM_DRAWN', item: movie(2000, '2') }));
    expect(await screen.findByText(/waiting for ben to place it/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /place/i })).toBeNull();
  });

  it('joins from an invite link and follows the host', async () => {
    remote.doc = createSessionDoc({ settings, host: { id: 'host', name: 'Ana', deviceId: 'd1' } });
    globalThis.history.replaceState(null, '', '/?join=abc123');
    const user = userEvent.setup();
    render(<App />);

    expect(main()).toHaveAttribute('data-step', 'joinForm');
    expect(screen.getByLabelText('Game code')).toHaveValue('ABC123');
    expect(globalThis.location.search).toBe('');

    await user.type(screen.getByLabelText('Your name'), 'Ben');
    await user.click(screen.getByRole('button', { name: 'Join game' }));
    expect(await screen.findByText('Waiting for the host to start the game…')).toBeInTheDocument();
    expect(screen.getByText('Movies · 10 points · Everything')).toBeInTheDocument();

    await push(applySessionEvent(remote.doc, { type: 'START' }));
    expect(await screen.findByText("Ana's turn")).toBeInTheDocument();
    expect(main()).toHaveAttribute('data-screen', 'game');

    // The host closing the session is surfaced instead of hanging.
    await push(null);
    expect(await screen.findByText('The host closed this game.')).toBeInTheDocument();
  });

  it('recovers when the driver draw is rejected', async () => {
    const { default: GameScreen } = await import('./components/game/GameScreen');
    const { default: PreferencesProvider } = await import('./preferences/PreferencesProvider');
    const lobby = addPlayer(createSessionDoc({ settings, host: { id: 'host', name: 'Ana', deviceId: 'd1' } }), {
      id: 'guest',
      name: 'Ben',
      deviceId: 'd2',
    });
    remote.doc = applySessionEvent(lobby, { type: 'START' });

    const accept = services.sendGameEvent.getMockImplementation();
    let rejected = false;
    services.sendGameEvent.mockImplementation(async (code, event) => {
      if (event.type === 'ITEM_DRAWN' && !rejected) {
        rejected = true;
        return false;
      }
      return accept(code, event);
    });

    try {
      const user = userEvent.setup();
      render(
        <PreferencesProvider>
          <GameScreen config={{ mode: 'online', gameCode: 'ABC123', playerId: 'host', ...settings }} onExit={() => {}} />
        </PreferencesProvider>,
      );
      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach the server");
      expect(main()).toHaveAttribute('data-phase', 'loading');

      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByRole('button', { name: 'Place as first item' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    } finally {
      services.sendGameEvent.mockImplementation(accept);
    }
  });

  it('shows join errors from the service', async () => {
    services.joinSession.mockRejectedValueOnce(new (await import('./game/session')).SessionError('errors.gameStarted'));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /multiple devices/i }));
    await user.click(screen.getByRole('button', { name: /join a game/i }));
    await user.type(screen.getByLabelText('Game code'), 'zzz999');
    await user.type(screen.getByLabelText('Your name'), 'Ben');
    await user.click(screen.getByRole('button', { name: 'Join game' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That game has already started.');
    expect(main()).toHaveAttribute('data-step', 'joinForm');
  });
});
