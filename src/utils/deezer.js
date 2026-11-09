/**
 * Resolves a playable preview for a song.
 *
 * Resolution chain (first success wins):
 *   1. Deezer API through each CORS proxy (5 s timeout each) → 30 s MP3 preview
 *   2. YouTube embed (may show ads, no progress info)
 *
 * Deezer preview URLs expire after ~24 h, so they are resolved at draw time
 * and never stored in `src/data`.
 */

const CORS_PROXIES = ['https://corsproxy.io/?', 'https://cors.eu.org/'];
const TIMEOUT_MS = 5000;

export const youtubeEmbedUrl = (youtubeId) =>
  `https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0&enablejsapi=1`;

export const isYouTubeUrl = (url) => typeof url === 'string' && url.includes('youtube.com/');

async function fetchDeezerTrack(deezerId, fetchImpl) {
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetchImpl(`${proxy}https://api.deezer.com/track/${deezerId}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = await response.json();
      if (data?.preview) return data;
    } catch (error) {
      console.warn(`[deezer] proxy ${proxy} failed:`, error.message);
    }
  }
  return null;
}

/**
 * @returns {Promise<{ previewUrl: string, albumCover: string|null }>}
 */
export async function fetchDeezerPreview(song, fetchImpl = globalThis.fetch) {
  const track = song.deezerId ? await fetchDeezerTrack(song.deezerId, fetchImpl) : null;
  return {
    previewUrl: track?.preview ?? youtubeEmbedUrl(song.youtubeId),
    albumCover: song.albumCover ?? track?.album?.cover_medium ?? null,
  };
}
