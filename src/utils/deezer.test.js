import { describe, expect, it, vi } from 'vitest';
import { deezerTrackUrl, fetchDeezerPreview, isYouTubeUrl, youtubeEmbedUrl } from './deezer';
import { song } from '../test/fixtures';

describe('fetchDeezerPreview', () => {
  it('loads the track from the Deezer API via JSONP', async () => {
    const load = vi.fn(async () => ({ preview: 'https://cdn/p.mp3', album: { cover_medium: 'c.jpg' } }));
    await expect(fetchDeezerPreview(song(1990), load)).resolves.toEqual({
      previewUrl: 'https://cdn/p.mp3',
      albumCover: 'c.jpg',
    });
    expect(load).toHaveBeenCalledWith('https://api.deezer.com/track/dz1990?output=jsonp', { timeout: 5000 });
  });

  it.each([
    ['an API error', async () => ({ error: { message: 'no data' } })],
    ['a network failure', async () => { throw new Error('timeout'); }],
  ])('falls back to YouTube on %s, keeping a known album cover', async (_, impl) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await fetchDeezerPreview(song(1990, 'abc', { albumCover: 'known.jpg' }), vi.fn(impl));
    expect(result).toEqual({ previewUrl: youtubeEmbedUrl('abc'), albumCover: 'known.jpg' });
    expect(isYouTubeUrl(result.previewUrl)).toBe(true);
  });

  it('skips Deezer for songs without a Deezer id', async () => {
    const load = vi.fn();
    const result = await fetchDeezerPreview(song(1990, 'abc', { deezerId: undefined }), load);
    expect(load).not.toHaveBeenCalled();
    expect(result.albumCover).toBeNull();
  });

  it('encodes the Deezer id into the URL', () => {
    expect(deezerTrackUrl('1/../x')).toBe('https://api.deezer.com/track/1%2F..%2Fx?output=jsonp');
  });
});
