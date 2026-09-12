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

  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid var(--color-border)' };

  return (
    <div>
      <div style={rowStyle}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-ink-soft)' }}>Couverture</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-faint)' }}>toujours affichée en premier</span>
      </div>
      {order.map((key, index) => (
        <div key={key} style={rowStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={!disabled.has(key)} onChange={() => toggle(key)} />
            {SECTION_LABELS[key]}
          </label>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="btn btn-outline btn-icon">↑</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1} className="btn btn-outline btn-icon">↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}
