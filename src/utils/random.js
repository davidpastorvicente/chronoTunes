/**
 * Cryptographically strong randomness helpers.
 *
 * Everything that needs randomness (game codes, item draws, ids) goes through
 * here so it is uniform, unbiased and easy to stub in tests.
 */

const UINT32_RANGE = 2 ** 32;

/** Returns an unbiased integer in [0, max). */
export function randomInt(max) {
  if (!Number.isInteger(max) || max <= 0) {
    throw new RangeError(`randomInt: max must be a positive integer, got ${max}`);
  }
  // Rejection sampling avoids modulo bias.
  const limit = UINT32_RANGE - (UINT32_RANGE % max);
  const buffer = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
}

/** Picks a random element, or `undefined` for an empty array. */
export function randomItem(items) {
  return items.length === 0 ? undefined : items[randomInt(items.length)];
}

/** Builds a random string of `length` characters taken from `alphabet`. */
export function randomString(length, alphabet) {
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}

/**
 * Returns a random unique identifier (UUID v4).
 * `crypto.randomUUID` only exists on secure origins (HTTPS / localhost); when
 * the dev server is opened from a phone over plain-HTTP LAN we build the UUID
 * from `getRandomValues`, which works everywhere.
 */
export function randomId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] % 16) + 0x40; // version 4
  bytes[8] = (bytes[8] % 64) + 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
