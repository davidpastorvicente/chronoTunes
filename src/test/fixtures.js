/** Shared fixtures for tests. */

export const song = (year, id = `yt${year}`, extra = {}) => ({
  title: `Song ${year}`,
  artist: `Artist ${year}`,
  year,
  youtubeId: id,
  deezerId: `dz${year}`,
  type: 'song',
  language: 'en',
  ...extra,
});

export const movie = (year, id = `${year}`, extra = {}) => ({
  title: `Movie ${year}`,
  year,
  backdropUrl: `https://image.tmdb.org/t/p/original/backdrop${id}.jpg`,
  posterUrl: `https://image.tmdb.org/t/p/original/poster${id}.jpg`,
  tmdbId: id,
  type: 'movie',
  language: 'en',
  ...extra,
});

export const show = (year, id = `${year}`) => ({ ...movie(year, id), title: `Show ${year}`, type: 'show' });

/**
 * Mimics a Firebase Realtime Database write + read: `null`/`undefined`
 * values and empty arrays/objects are not stored.
 */
export function firebaseRoundTrip(value) {
  if (Array.isArray(value)) {
    const items = value.map(firebaseRoundTrip).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, firebaseRoundTrip(item)])
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value ?? undefined;
}
