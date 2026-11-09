import { jsonp } from './jsonp';

/**
 * Resolves a playable preview for a song.
 *
 * Resolution chain (first success wins):
 *   1. Deezer API via JSONP (`output=jsonp`) → 30 s MP3 preview + album cover.
 *      Deezer sends no CORS headers, but JSONP needs none, so there is no
 *      third-party CORS proxy to break or rate-limit us.
 *   2. YouTube embed (may show ads, no progress info).
 *
 * Deezer preview URLs expire after ~24 h, so they are resolved at draw time
 * and never stored in `src/data`.
 */

const DEEZER_TRACK_URL = 'https://api.deezer.com/track/';
const TIMEOUT_MS = 5000;

export const youtubeEmbedUrl = (youtubeId) =>
  `https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0&enablejsapi=1`;

export const isYouTubeUrl = (url) => typeof url === 'string' && url.includes('youtube.com/');

export const deezerTrackUrl = (deezerId) =>
  `${DEEZER_TRACK_URL}${encodeURIComponent(deezerId)}?output=jsonp`;

async function fetchDeezerTrack(deezerId, load) {
  try {
    const track = await load(deezerTrackUrl(deezerId), { timeout: TIMEOUT_MS });
    if (track?.preview) return track;
    console.warn(`[deezer] no preview for track ${deezerId}:`, track?.error?.message ?? 'empty response');
  } catch (error) {
    console.warn(`[deezer] track ${deezerId} failed:`, error.message);
  }
  return null;
}

/**
 * @param {object} song item with `deezerId`, `youtubeId` and optional `albumCover`
 * @param {typeof jsonp} [load] injectable loader (tests)
 * @returns {Promise<{ previewUrl: string, albumCover: string|null }>}
 */
export async function fetchDeezerPreview(song, load = jsonp) {
  const track = song.deezerId ? await fetchDeezerTrack(song.deezerId, load) : null;
  return {
    previewUrl: track?.preview ?? youtubeEmbedUrl(song.youtubeId),
    albumCover: song.albumCover ?? track?.album?.cover_medium ?? null,
  };
}
