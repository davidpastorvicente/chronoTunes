import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import SongPlayer from './SongPlayer';
import PreferencesProvider from '../../preferences/PreferencesProvider';
import { youtubeEmbedUrl } from '../../utils/deezer';
import { song } from '../../test/fixtures';

const renderPlayer = (previewUrl) =>
  render(
    <PreferencesProvider>
      <SongPlayer song={{ ...song(1990), previewUrl }} />
    </PreferencesProvider>,
  );

const state = () => document.querySelector('.song-player').dataset.state;

beforeEach(() => localStorage.setItem('chronotunes_language', 'en'));

describe('SongPlayer', () => {
  it('walks through the player machine with media events', async () => {
    const user = userEvent.setup();
    renderPlayer('https://cdn/preview.mp3');
    const audio = document.querySelector('audio');
    expect(state()).toBe('idle');

    await user.click(screen.getByRole('button', { name: 'Play preview' }));
    expect(audio.play).toHaveBeenCalled();
    expect(state()).toBe('loading');

    fireEvent.playing(audio);
    expect(state()).toBe('playing');
    expect(screen.getByRole('status')).toHaveTextContent('Playing');

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(audio.pause).toHaveBeenCalled();
    expect(state()).toBe('paused');

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    fireEvent.playing(audio);
    fireEvent.ended(audio);
    expect(state()).toBe('ended');
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
  });

  it('shows a retry action when the audio fails', async () => {
    renderPlayer('https://cdn/broken.mp3');
    fireEvent.error(document.querySelector('audio'));
    expect(state()).toBe('idle'); // errors before playing are ignored until the user presses play

    await userEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    fireEvent.error(document.querySelector('audio'));
    expect(state()).toBe('error');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('mounts the YouTube fallback only after pressing play', async () => {
    renderPlayer(youtubeEmbedUrl('abc'));
    expect(document.querySelector('iframe')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    const iframe = document.querySelector('iframe');
    expect(iframe).toHaveAttribute('src', youtubeEmbedUrl('abc'));
    fireEvent.load(iframe);
    expect(state()).toBe('playing');
  });
});
