/**
 * Pure game rules. No React, no Firebase, no I/O — safe to use anywhere
 * (reducers, Firebase transactions, tests, scripts).
 */

export const MEDIA_TYPES = Object.freeze(['song', 'movie', 'show']);
export const CATEGORIES = Object.freeze(['songs', 'movies', 'shows', 'all']);
export const CONTENT_SETS = Object.freeze(['everything', 'english', 'spanish', 'new']);
export const WINNING_SCORES = Object.freeze([5, 10, 15, 20]);
export const MAX_LOCAL_PLAYERS = 6;
export const MIN_ONLINE_PLAYERS = 2;
export const MAX_NAME_LENGTH = 20;

/**
 * Stable identifier of a media item. TMDB movie and TV ids live in different
 * namespaces, so the type is part of the id to avoid collisions in "all" mode.
 */
export function itemId(item) {
  return item.type === 'song' ? `song:${item.youtubeId}` : `${item.type}:${item.tmdbId}`;
}

/** True when every item is in non-decreasing year order. */
export function isChronological(timeline) {
  return timeline.every((item, i) => i === 0 || timeline[i - 1].year <= item.year);
}

/** Returns a copy of `timeline` with `item` inserted at `position`. */
export function insertAt(timeline, position, item) {
  return [...timeline.slice(0, position), item, ...timeline.slice(position)];
}

/**
 * Lists the distinct places where a new item can be inserted. Gaps between
 * two items of the same year are skipped because they are equivalent to the
 * neighbouring gap.
 *
 * @returns {Array<{ position: number, kind: 'first'|'before'|'between'|'after', from?: number, to?: number }>}
 */
export function getPlacementOptions(timeline) {
  if (timeline.length === 0) return [{ position: 0, kind: 'first' }];

  const options = [{ position: 0, kind: 'before', to: timeline[0].year }];
  for (let i = 1; i < timeline.length; i++) {
    const from = timeline[i - 1].year;
    const to = timeline[i].year;
    if (from !== to) options.push({ position: i, kind: 'between', from, to });
  }
  options.push({ position: timeline.length, kind: 'after', from: timeline.at(-1).year });
  return options;
}

/** Index of the single highest scorer, or `null` when tied (or nobody scored). */
export function leaderIndex(players) {
  const best = Math.max(...players.map((p) => p.score));
  const leaders = players.flatMap((p, i) => (p.score === best ? [i] : []));
  return leaders.length === 1 && best > 0 ? leaders[0] : null;
}

/** Index of the next player in turn order. */
export function nextPlayerIndex(currentIndex, playerCount) {
  return (currentIndex + 1) % playerCount;
}

/** Groups consecutive items with the same year, keeping their original index. */
export function groupByYear(items) {
  const groups = [];
  items.forEach((item, index) => {
    const last = groups.at(-1);
    if (last?.year === item.year) last.entries.push({ item, index });
    else groups.push({ year: item.year, entries: [{ item, index }] });
  });
  return groups;
}
