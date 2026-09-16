/**
 * Resolve the audio preview URL for a song.
 *
 * Music is played exclusively from YouTube. The actual audio stream is
 * extracted server-side with yt-dlp and proxied through our backend
 * (see `server/index.js`), so the browser just points an <audio> element
 * at `/api/audio?v=<youtubeId>`.
 *
 * @param {Object} song - Song object with a `youtubeId`
 * @returns {{ previewUrl: string|null, albumCover: string|null }}
 */
export async function fetchAudioPreview(song) {
  // Base URL for the audio backend. Empty string means same origin, which is
  // the normal case: in dev the Vite server runs the yt-dlp middleware, and in
  // production the Express server serves both the app and /api/audio.
  const apiBase = import.meta.env.VITE_AUDIO_API_BASE || '';

  let previewUrl = null;
  if (song.youtubeId) {
    previewUrl = `${apiBase}/api/audio?v=${encodeURIComponent(song.youtubeId)}`;
  }

  // Album covers previously came from Deezer; not available with YouTube-only playback.
  const albumCover = song.albumCover || null;

  return { previewUrl, albumCover };
}
