import { CATEGORIES, CONTENT_SETS, WINNING_SCORES } from '../../game/rules';
import { useT } from '../../preferences/context';
import ChoiceGroup from '../ui/ChoiceGroup';
import { CATEGORY_ICONS } from '../ui/iconMaps';

/** Category, points to win and content set — shared by single- and multi-device setup. */
export default function GameSettingsFields({ settings, onChange }) {
  const t = useT();
  return (
    <>
      <ChoiceGroup
        legend={t('setup.category')}
        value={settings.category}
        options={CATEGORIES.map((value) => ({ value, label: t(`category.${value}`), icon: CATEGORY_ICONS[value] }))}
        onChange={(category) => onChange({ category })}
      />
      <ChoiceGroup
        legend={t('setup.winningScore')}
        hint={t('setup.winningScoreHint')}
        value={settings.winningScore}
        options={WINNING_SCORES.map((value) => ({ value, label: String(value) }))}
        onChange={(winningScore) => onChange({ winningScore })}
      />
      <ChoiceGroup
        legend={t('setup.contentSet')}
        value={settings.contentSet}
        options={CONTENT_SETS.map((value) => ({ value, label: t(`contentSet.${value}`) }))}
        onChange={(contentSet) => onChange({ contentSet })}
      />
    </>
  );
}
