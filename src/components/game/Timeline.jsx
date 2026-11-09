import { useEffect, useRef } from 'react';
import { useT } from '../../preferences/context';
import Icon from '../ui/Icon';
import { MEDIA_TYPE_ICONS } from '../ui/iconMaps';
import { groupByYear, itemId } from '../../game/rules';
import { toneFor } from './tones';

/**
 * A player's timeline: a horizontal axis with one marker per year and the
 * items of that year hanging below it, each in its own pastel tone.
 * `highlightIndex` marks the item that was just placed.
 */
export default function Timeline({ items, showTypeIcons = false, highlightIndex = null }) {
  const t = useT();
  const listRef = useRef(null);

  // Bring the item that was just placed into view.
  useEffect(() => {
    if (highlightIndex == null) return;
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    listRef.current?.querySelector('.is-new')?.scrollIntoView?.({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [highlightIndex]);

  if (items.length === 0) {
    return <p className="timeline-empty">{t('timeline.empty')}</p>;
  }

  return (
    <ol className="timeline" ref={listRef}>
      {groupByYear(items).map((group) => (
        <li key={itemId(group.entries[0].item)} className="timeline-group">
          <span className="timeline-year">{group.year}</span>
          <span className={`timeline-marker tone-${toneFor(group.entries[0].item)}`} aria-hidden="true" />
          <ul className="timeline-stack">
            {group.entries.map(({ item, index }) => (
              <li
                key={itemId(item)}
                className={`timeline-item tone-${toneFor(item)} ${index === highlightIndex ? 'is-new' : ''}`}
              >
                <span className="timeline-item-title">{item.title}</span>
                <span className="timeline-item-meta">
                  {showTypeIcons && <Icon name={MEDIA_TYPE_ICONS[item.type]} size={12} label={t(`media.${item.type}`)} />}
                  {item.type === 'song' ? item.artist : t(`media.${item.type}`)}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
