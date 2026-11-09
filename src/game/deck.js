import { itemId } from './rules.js';
import { randomItem } from '../utils/random.js';
import { fetchDeezerPreview } from '../utils/deezer.js';

/** Picks a random item that has not been used yet, or `null` if none remain. */
export function pickUnusedItem(media, usedItemIds, pick = randomItem) {
  const used = new Set(usedItemIds);
  return pick(media.filter((item) => !used.has(itemId(item)))) ?? null;
}

/** Adds runtime-only data to an item (songs need a fresh preview URL). */
export async function prepareItem(item) {
  if (item.type !== 'song') return item;
  const { previewUrl, albumCover } = await fetchDeezerPreview(item);
  return { ...item, previewUrl, albumCover };
}

/**
 * Draws the next item and returns the matching game machine event:
 * `ITEM_DRAWN` with the prepared item, or `DECK_EXHAUSTED`.
 */
export async function drawNextEvent(media, usedItemIds, { pick, prepare = prepareItem } = {}) {
  const item = pickUnusedItem(media, usedItemIds, pick);
  if (!item) return { type: 'DECK_EXHAUSTED' };
  return { type: 'ITEM_DRAWN', item: await prepare(item) };
}
