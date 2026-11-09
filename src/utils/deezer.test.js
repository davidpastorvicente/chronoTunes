import { describe, expect, it, vi } from 'vitest';
import { fetchDeezerPreview, isYouTubeUrl, youtubeEmbedUrl } from './deezer';
import { song } from '../test/fixtures';

const json = (data) => Promise.resolve({ json: () => Promise.resolve(data) });

describe('fetchDeezerPreview', () => {
  it('uses the first proxy that returns a preview', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockReturnValueOnce(json({ preview: 'https://cdn/p.mp3', album: { cover_medium: 'c.jpg' } }));

    await expect(fetchDeezerPreview(song(1990), fetchImpl)).resolves.toEqual({
      previewUrl: 'https://cdn/p.mp3',
      albumCover: 'c.jpg',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0]).toContain('https://api.deezer.com/track/dz1990');
  });

  it('falls back to YouTube when every proxy fails, keeping a known album cover', async () => {
    const fetchImpl = vi.fn(() => json({ error: 'quota' }));
    const result = await fetchDeezerPreview(song(1990, 'abc', { albumCover: 'known.jpg' }), fetchImpl);
    expect(result).toEqual({ previewUrl: youtubeEmbedUrl('abc'), albumCover: 'known.jpg' });
    expect(isYouTubeUrl(result.previewUrl)).toBe(true);
  });

  it('skips Deezer for songs without a Deezer id', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchDeezerPreview(song(1990, 'abc', { deezerId: undefined }), fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.albumCover).toBeNull();
  });
});
