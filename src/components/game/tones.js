import { itemId } from '../../game/rules';

/**
 * Soft pastel tones for timeline items (defined in styles/tokens.css as
 * `.tone-*`). The tone is derived from the item id, so an item keeps its
 * colour across turns, players and devices.
 */
export const TONES = Object.freeze(['rose', 'peach', 'butter', 'mint', 'sky', 'lavender', 'aqua']);

export function toneFor(item) {
  let hash = 0;
  for (const char of itemId(item)) {
    hash = (hash * 31 + char.codePointAt(0)) % 2147483647;
  }
  return TONES[hash % TONES.length];
}
