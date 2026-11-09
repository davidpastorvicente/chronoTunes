import { describe, expect, it, vi } from 'vitest';
import { drawNextEvent, pickUnusedItem, prepareItem } from './deck';
import { movie, song } from '../test/fixtures';

vi.mock('../utils/deezer.js', () => ({
  fetchDeezerPreview: vi.fn(async () => ({ previewUrl: 'https://cdn/preview.mp3', albumCover: 'cover.jpg' })),
}));

const first = (items) => items[0];

describe('deck', () => {
  const media = [song(1990), song(2000), movie(2010)];

  it('only picks unused items', () => {
    expect(pickUnusedItem(media, ['song:yt1990'], first)).toEqual(song(2000));
    expect(pickUnusedItem(media, ['song:yt1990', 'song:yt2000', 'movie:2010'])).toBeNull();
  });

  it('adds a fresh preview to songs only', async () => {
    expect(await prepareItem(song(1990))).toMatchObject({ previewUrl: 'https://cdn/preview.mp3', albumCover: 'cover.jpg' });
    expect(await prepareItem(movie(2010))).toEqual(movie(2010));
  });

  it('turns the draw into a game machine event', async () => {
    const prepare = vi.fn(async (item) => ({ ...item, prepared: true }));
    expect(await drawNextEvent(media, [], { pick: first, prepare })).toEqual({
      type: 'ITEM_DRAWN',
      item: { ...song(1990), prepared: true },
    });
    expect(await drawNextEvent([], [])).toEqual({ type: 'DECK_EXHAUSTED' });
  });
});
