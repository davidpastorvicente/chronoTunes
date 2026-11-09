/**
 * TMDB URLs in `src/data` point to the `original` rendition (often several
 * MB). Ask for a size that fits the UI instead.
 * @param {string} url
 * @param {'w342'|'w500'|'w780'|'w1280'|'original'} size
 */
export function tmdbImage(url, size) {
  return typeof url === 'string' ? url.replace('/t/p/original/', `/t/p/${size}/`) : url;
}
