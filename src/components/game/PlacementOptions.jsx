import { useT } from '../../preferences/context';
import { getPlacementOptions } from '../../game/rules';
import Icon from '../ui/Icon';

const KIND_ICONS = { first: 'plus', before: 'arrowLeft', between: 'moveHorizontal', after: 'arrowRight' };

/** Full sentence for assistive tech, e.g. "Before 2015" / "1994 – 2021". */
const ariaLabelFor = (t, option) =>
  option.kind === 'first'
    ? t('placement.first')
    : t(`placement.${option.kind}`, { year: option.to ?? option.from, from: option.from, to: option.to });

function Years({ option }) {
  if (option.kind === 'between') {
    return (
      <span className="slot-years">
        {option.from}
        <span className="slot-dash" aria-hidden="true" />
        {option.to}
      </span>
    );
  }
  return <span className="slot-years">{option.to ?? option.from}</span>;
}

/** One "slot" card per distinct gap in the active player's timeline. */
export default function PlacementOptions({ timeline, onPlace, disabled }) {
  const t = useT();
  const options = getPlacementOptions(timeline);
  return (
    <div className="placement">
      <p className="field-label">{t('game.placePrompt')}</p>
      <div className="placement-grid">
        {options.map((option) => (
          <button
            key={option.position}
            type="button"
            className={`slot slot-${option.kind}`}
            disabled={disabled}
            onClick={() => onPlace(option.position)}
            aria-label={ariaLabelFor(t, option)}
            data-position={option.position}
          >
            <span className="slot-kind">
              <Icon name={KIND_ICONS[option.kind]} size={14} />
              {t(`placement.kind.${option.kind}`)}
            </span>
            {option.kind === 'first' ? <span className="slot-label">{t('placement.first')}</span> : <Years option={option} />}
          </button>
        ))}
      </div>
    </div>
  );
}
