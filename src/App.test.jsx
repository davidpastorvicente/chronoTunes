import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { movie } from './test/fixtures';

vi.mock('./utils/mediaLoader', () => ({
  loadMediaByCategory: () => [movie(1990, '1'), movie(2000, '2'), movie(2010, '3')],
}));

// Deterministic deck: always draw the first unused item.
vi.mock('./utils/random', async (importOriginal) => ({
  ...(await importOriginal()),
  randomItem: (items) => items[0],
}));

const main = () => document.querySelector('main');

beforeEach(() => {
  vi.stubEnv('VITE_DISABLE_AUTH', 'true');
  localStorage.setItem('chronotunes_language', 'en');
});

describe('single-device game (integration)', () => {
  it('plays until the deck runs out, then restarts and exits', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(main()).toHaveAttribute('data-step', 'chooseMode');
    await user.click(screen.getByRole('button', { name: /single device/i }));

    await user.type(screen.getByLabelText('Player 1 name'), 'Ana');
    await user.type(screen.getByLabelText('Player 2 name'), 'Ben');
    await user.click(screen.getByRole('radio', { name: 'Movies' }));
    await user.click(screen.getByRole('button', { name: 'Start game' }));

    // Turn 1 — Ana places the 1990 movie into her empty timeline.
    await user.click(await screen.findByRole('button', { name: 'Place as first item' }));
    expect(screen.getByRole('banner')).toHaveTextContent("Ana's turn");
    expect(main()).toHaveAttribute('data-phase', 'result');
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText('Next up: Ben')).toBeInTheDocument();

    // Turn 2 — Ben places 2000.
    await user.click(screen.getByRole('button', { name: /next turn/i }));
    await user.click(await screen.findByRole('button', { name: 'Place as first item' }));

    // Turn 3 — Ana gets 2010 and wrongly places it before 1990.
    await user.click(screen.getByRole('button', { name: /next turn/i }));
    await user.click(await screen.findByRole('button', { name: 'Before 1990' }));
    expect(screen.getByText('Not quite')).toBeInTheDocument();

    // The deck is empty: game over with a 1–1 tie.
    await user.click(screen.getByRole('button', { name: /next turn/i }));
    expect(await screen.findByRole('heading', { name: "It's a tie!" })).toBeInTheDocument();
    expect(screen.getByText('The deck ran out of items.')).toBeInTheDocument();
    const scores = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(scores.map((row) => row.textContent)).toEqual(['Ana1', 'Ben1']);

    // Play again keeps the settings and starts a fresh deck.
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(await screen.findByRole('button', { name: 'Place as first item' })).toBeInTheDocument();

    // Exiting asks for confirmation (focus moves in, Escape cancels and restores focus)…
    const exitTrigger = screen.getByRole('button', { name: 'Exit game' });
    await user.click(exitTrigger);
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Back' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Exit game' })).toHaveFocus();

    // …then returns to setup with saved names.
    await user.click(screen.getByRole('button', { name: 'Exit game' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Exit game' }));
    expect(main()).toHaveAttribute('data-screen', 'setup');
    await user.click(screen.getByRole('button', { name: /single device/i }));
    expect(screen.getByLabelText('Player 1 name')).toHaveValue('Ana');
    expect(screen.getByRole('radio', { name: 'Movies' })).toBeChecked();
  });

  it('resumes the game after a page reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: /single device/i }));
    await user.type(screen.getByLabelText('Player 1 name'), 'Ana');
    await user.type(screen.getByLabelText('Player 2 name'), 'Ben');
    await user.click(screen.getByRole('radio', { name: 'Movies' }));
    await user.click(screen.getByRole('button', { name: 'Start game' }));
    await user.click(await screen.findByRole('button', { name: 'Place as first item' }));
    await user.click(screen.getByRole('button', { name: /next turn/i }));
    expect(await screen.findByRole('button', { name: 'Place as first item' })).toBeInTheDocument();

    // Reload: Ben's turn continues with the same item and Ana keeps her point.
    unmount();
    const reloaded = render(<App />);
    expect(main()).toHaveAttribute('data-phase', 'playing');
    expect(screen.getByRole('banner')).toHaveTextContent("Ben's turn");
    expect(screen.getAllByText('1 / 10')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Place as first item' }));
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next turn/i }));
    expect(await screen.findByRole('button', { name: 'Before 1990' })).toBeInTheDocument();

    // After exiting, a reload starts from setup again.
    await user.click(screen.getByRole('button', { name: 'Exit game' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Exit game' }));
    reloaded.unmount();
    render(<App />);
    expect(main()).toHaveAttribute('data-step', 'chooseMode');
  });

  it('returns to the mode selection when the brand is clicked in setup', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /single device/i }));
    expect(main()).toHaveAttribute('data-step', 'localSetup');
    await user.click(screen.getByRole('button', { name: 'ChronoTunes' }));
    expect(main()).toHaveAttribute('data-step', 'chooseMode');
  });

  it('switches language and theme from the header', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('¿Cómo queréis jugar?');
    expect(document.documentElement.lang).toBe('es');

    const before = document.documentElement.dataset.theme;
    await user.click(screen.getByRole('button', { name: /modo (oscuro|claro)/i }));
    expect(document.documentElement.dataset.theme).not.toBe(before);
  });
});
