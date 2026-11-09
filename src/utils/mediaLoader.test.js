import { describe, expect, it } from 'vitest';
import { interleaveBalanced, loadMediaByCategory, movieSets, showSets, songSets } from './mediaLoader';
import { tmdbImage } from './images';
import { CONTENT_SETS, itemId } from '../game/rules';
import songs from '../data/songs.json';
import movies from '../data/movies.json';
import shows from '../data/shows.json';

describe('media data integrity', () => {
  it.each([
    ['songs.json', songs, 'song', ['title', 'artist', 'year', 'youtubeId', 'type', 'language']],
    ['movies.json', movies, 'movie', ['title', 'year', 'backdropUrl', 'posterUrl', 'tmdbId', 'type', 'language']],
    ['shows.json', shows, 'show', ['title', 'year', 'backdropUrl', 'posterUrl', 'tmdbId', 'type', 'language']],
  ])('%s has complete items of the right type', (_, items, type, fields) => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      for (const field of fields) expect(item[field], `${item.title}.${field}`).toBeTruthy();
      expect(item.type).toBe(type);
      expect(['en', 'es']).toContain(item.language);
      expect(Number.isInteger(item.year)).toBe(true);
    }
  });

  it('has no duplicate ids within a file', () => {
    for (const items of [songs, movies, shows]) {
      const ids = items.map(itemId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('loadMediaByCategory', () => {
  it('filters content sets', () => {
    expect(songSets.english.every((s) => s.language === 'en')).toBe(true);
    expect(movieSets.spanish.every((s) => s.language === 'es')).toBe(true);
    expect(showSets.new.every((s) => s.year >= 2010)).toBe(true);
  });

  it.each(CONTENT_SETS)('mixes all three types for "all" (%s)', (contentSet) => {
    const media = loadMediaByCategory('all', contentSet);
    expect(new Set(media.map((m) => m.type))).toEqual(new Set(['song', 'movie', 'show']));
    expect(media.every(Boolean)).toBe(true);
  });

  it('rejects unknown categories', () => {
    expect(() => loadMediaByCategory('books', 'everything')).toThrow(/Unknown/);
  });
});

describe('interleaveBalanced', () => {
  it('repeats shorter lists, interleaves, and ignores empty lists', () => {
    expect(interleaveBalanced([['a1', 'a2'], ['b1'], []])).toEqual(['a1', 'b1', 'a2', 'b1']);
    expect(interleaveBalanced([[], []])).toEqual([]);
  });
});

describe('tmdbImage', () => {
  it('requests a smaller TMDB rendition', () => {
    expect(tmdbImage('https://image.tmdb.org/t/p/original/x.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/x.jpg');
    expect(tmdbImage(undefined, 'w342')).toBeUndefined();
  });
});
