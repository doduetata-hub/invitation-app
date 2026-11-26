import { SECTION_LABELS, TOGGLABLE_SECTIONS } from '../../shared/constants/design';
import { DEFAULT_SECTIONS_ORDER } from '../../public/templates/registry';

export default function SectionsToggle({ theme, onChange }) {
  const order = (theme.sectionsOrder || DEFAULT_SECTIONS_ORDER).filter((k) => TOGGLABLE_SECTIONS.includes(k));
  const disabled = new Set(theme.disabledSections || []);

  const commitOrder = (newOrder) => onChange({ ...theme, sectionsOrder: ['cover', ...newOrder] });

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    commitOrder(next);
  };

  const toggle = (key) => {
    const nextDisabled = new Set(disabled);
    if (nextDisabled.has(key)) {
      nextDisabled.delete(key);
    } else {
      nextDisabled.add(key);
    }
    onChange({ ...theme, disabledSections: Array.from(nextDisabled) });
  };

  return (
    <div>
      <div className="toggle-row">
        <span>Couverture</span>
        <span className="toggle-row__note">toujours affichée en premier</span>
      </div>
      {order.map((key, index) => (
        <div key={key} className="toggle-row">
          <label>
            <input type="checkbox" checked={!disabled.has(key)} onChange={() => toggle(key)} />
            {SECTION_LABELS[key]}
          </label>
          <div className="row-actions">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="row-action" aria-label={`Monter : ${SECTION_LABELS[key]}`} title="Monter">↑</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1} className="row-action" aria-label={`Descendre : ${SECTION_LABELS[key]}`} title="Descendre">↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}
