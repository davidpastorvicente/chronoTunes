import { useT } from '../../preferences/context';
import { tmdbImage } from '../../utils/images';
import Icon from '../ui/Icon';

/** Reveal after a placement: correct/wrong, artwork, title and year. */
export default function ResultCard({ item, correct, playerName }) {
  const t = useT();
  const artwork = item.type === 'song' ? item.albumCover : tmdbImage(item.posterUrl, 'w342');

  return (
    <div className={`result ${correct ? 'is-correct' : 'is-wrong'}`} role="status">
      <span className={`chip ${correct ? 'chip-success' : 'chip-error'}`}>
        <Icon name={correct ? 'check' : 'x'} size={14} />
        {t(correct ? 'game.correct' : 'game.wrong')}
      </span>
      <div className="result-body">
        {artwork && (
          <img
            className={`result-art ${item.type === 'song' ? 'is-square' : ''}`}
            src={artwork}
            alt={t('media.coverAlt', { title: item.title })}
          />
        )}
        <div className="result-info">
          <p className="overline">{t(`media.${item.type}`)}</p>
          <h2 className="heading-subhead">{item.title}</h2>
          {item.artist && <p className="text-secondary">{item.artist}</p>}
          <p className="result-year">{item.year}</p>
        </div>
      </div>
      <p className="text-secondary">{t(correct ? 'game.correctFor' : 'game.wrongFor', { name: playerName })}</p>
    </div>
  );
}
