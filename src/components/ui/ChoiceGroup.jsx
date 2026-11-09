import { useId } from 'react';
import Icon from './Icon';

/**
 * Single-choice group rendered as pill chips. Built on native radio inputs,
 * so arrow keys, focus and screen readers work out of the box.
 *
 * @param {{ legend: string, hint?: string, name?: string, value: any,
 *   options: Array<{ value: any, label: string, icon?: string }>,
 *   onChange: (value: any) => void }} props
 */
export default function ChoiceGroup({ legend, hint, name, value, options, onChange }) {
  const generatedName = useId();
  const hintId = `${generatedName}-hint`;
  return (
    <fieldset className="field" aria-describedby={hint ? hintId : undefined}>
      <legend className="field-label">{legend}</legend>
      <div className="chip-group">
        {options.map((option) => (
          <label key={String(option.value)} className="chip chip-choice">
            <input
              type="radio"
              className="sr-only"
              name={name ?? generatedName}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.icon && <Icon name={option.icon} size={16} />}
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
    </fieldset>
  );
}
