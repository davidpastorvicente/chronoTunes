import { describe, expect, it } from 'vitest';
import {
  getPlacementOptions,
  groupByYear,
  insertAt,
  isChronological,
  itemId,
  leaderIndex,
  nextPlayerIndex,
} from './rules';
import { movie, show, song } from '../test/fixtures';

describe('itemId', () => {
  it('namespaces ids by media type so TMDB movie and TV ids never collide', () => {
    expect(itemId(song(2000, 'abc'))).toBe('song:abc');
    expect(itemId(movie(2000, '42'))).toBe('movie:42');
    expect(itemId(show(2000, '42'))).toBe('show:42');
  });
});

describe('isChronological', () => {
  it.each([
    [[], true],
    [[song(1990)], true],
    [[song(1990), song(1990), song(2000)], true],
    [[song(2000), song(1990)], false],
  ])('%#', (timeline, expected) => {
    expect(isChronological(timeline)).toBe(expected);
  });
});

describe('insertAt', () => {
  it('returns a new array with the item inserted', () => {
    const timeline = [song(1990), song(2010)];
    const result = insertAt(timeline, 1, song(2000));
    expect(result.map((i) => i.year)).toEqual([1990, 2000, 2010]);
    expect(timeline).toHaveLength(2);
  });
});

describe('getPlacementOptions', () => {
  it('offers a single "first" slot for an empty timeline', () => {
    expect(getPlacementOptions([])).toEqual([{ position: 0, kind: 'first' }]);
  });

  it('offers before, between and after slots and skips gaps between equal years', () => {
    const options = getPlacementOptions([song(1980), song(1980), song(2000)]);
    expect(options).toEqual([
      { position: 0, kind: 'before', to: 1980 },
      { position: 2, kind: 'between', from: 1980, to: 2000 },
      { position: 3, kind: 'after', from: 2000 },
    ]);
  });
});

describe('leaderIndex', () => {
  it('returns the single highest scorer', () => {
    expect(leaderIndex([{ score: 1 }, { score: 3 }, { score: 2 }])).toBe(1);
  });

  it('returns null on ties or when nobody scored', () => {
    expect(leaderIndex([{ score: 2 }, { score: 2 }])).toBeNull();
    expect(leaderIndex([{ score: 0 }, { score: 0 }])).toBeNull();
  });
});

describe('nextPlayerIndex', () => {
  it('wraps around', () => {
    expect(nextPlayerIndex(0, 3)).toBe(1);
    expect(nextPlayerIndex(2, 3)).toBe(0);
  });
});

describe('groupByYear', () => {
  it('groups consecutive items of the same year and keeps their index', () => {
    const groups = groupByYear([song(1990), song(1990), song(2000)]);
    expect(groups.map((g) => [g.year, g.entries.map((e) => e.index)])).toEqual([
      [1990, [0, 1]],
      [2000, [2]],
    ]);
  });
});
