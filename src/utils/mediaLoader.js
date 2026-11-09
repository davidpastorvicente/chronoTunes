import songs from '../data/songs.json';
import movies from '../data/movies.json';
import shows from '../data/shows.json';

const RECENT_FROM_YEAR = 2010;

function createMediaSets(items) {
  return {
    everything: items,
    english: items.filter((item) => item.language === 'en'),
    spanish: items.filter((item) => item.language === 'es'),
    new: items.filter((item) => item.year >= RECENT_FROM_YEAR),
  };
}

export const songSets = createMediaSets(songs);
export const movieSets = createMediaSets(movies);
export const showSets = createMediaSets(shows);

const SETS_BY_CATEGORY = { songs: songSets, movies: movieSets, shows: showSets };

/**
 * Mixes several lists so each one is equally likely to be drawn: smaller
 * lists are repeated up to the length of the longest, then interleaved.
 * Repeated entries share an id, so they disappear together once drawn.
 */
export function interleaveBalanced(lists) {
  const nonEmpty = lists.filter((list) => list.length > 0);
  const length = Math.max(0, ...nonEmpty.map((list) => list.length));
  return Array.from({ length }, (_, i) => nonEmpty.map((list) => list[i % list.length])).flat();
}

/**
 * Loads media items for a category and content set.
 * @param {'songs'|'movies'|'shows'|'all'} category
 * @param {'everything'|'english'|'spanish'|'new'} contentSet
 */
export function loadMediaByCategory(category, contentSet) {
  if (category === 'all') {
    return interleaveBalanced([songSets[contentSet], movieSets[contentSet], showSets[contentSet]]);
  }
  const sets = SETS_BY_CATEGORY[category];
  if (!sets?.[contentSet]) {
    throw new Error(`Unknown category/content set: ${category}/${contentSet}`);
  }
  return sets[contentSet];
}
