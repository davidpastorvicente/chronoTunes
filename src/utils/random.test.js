import { describe, expect, it, vi } from 'vitest';
import { randomId, randomInt, randomItem, randomString } from './random';

describe('randomInt', () => {
  it('stays within [0, max)', () => {
    for (let i = 0; i < 500; i++) {
      const value = randomInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it('rejects invalid bounds', () => {
    expect(() => randomInt(0)).toThrow(RangeError);
    expect(() => randomInt(1.5)).toThrow(RangeError);
  });

  it('re-samples values that would introduce modulo bias', () => {
    const values = [2 ** 32 - 1, 5];
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((buffer) => {
      buffer[0] = values.shift();
      return buffer;
    });
    // 2^32 - 1 is above the largest multiple of 3, so it must be rejected.
    expect(randomInt(3)).toBe(5 % 3);
  });
});

describe('randomItem / randomString / randomId', () => {
  it('picks from the array or returns undefined when empty', () => {
    expect(['a', 'b']).toContain(randomItem(['a', 'b']));
    expect(randomItem([])).toBeUndefined();
  });

  it('builds strings from the alphabet', () => {
    expect(randomString(6, 'AB')).toMatch(/^[AB]{6}$/);
  });

  it('returns unique ids', () => {
    expect(randomId()).not.toBe(randomId());
  });

  it('builds a valid UUID v4 where crypto.randomUUID is unavailable (plain-HTTP origins)', () => {
    const realCrypto = globalThis.crypto;
    const getRandomValues = vi.fn((buffer) => realCrypto.getRandomValues(buffer));
    vi.stubGlobal('crypto', { getRandomValues });
    const id = randomId();
    expect(getRandomValues).toHaveBeenCalled();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
