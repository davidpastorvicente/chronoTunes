import { describe, expect, it } from 'vitest';
import { TONES, toneFor } from './tones';
import { movie, song } from '../../test/fixtures';

describe('toneFor', () => {
  it('is stable per item and always a known tone', () => {
    expect(toneFor(song(1990))).toBe(toneFor({ ...song(1990), title: 'renamed' }));
    const tones = Array.from({ length: 40 }, (_, i) => toneFor(movie(1950 + i, String(i))));
    expect(tones.every((tone) => TONES.includes(tone))).toBe(true);
    expect(new Set(tones).size).toBeGreaterThan(3); // spreads across the palette
  });
});
