import Icon from '../ui/Icon';

/** Large choice card (Genesis "kit card"): icon, title, description. */
export default function OptionCard({ icon, title, description, onClick, disabled, note }) {
  return (
    <button type="button" className="card option-card" onClick={onClick} disabled={disabled}>
      <span className="icon-tile" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <span className="option-card-text">
        <span className="option-card-title">{title}</span>
        <span className="option-card-description">{note ?? description}</span>
      </span>
      <Icon name="arrowRight" className="option-card-arrow" />
    </button>
  );
}
