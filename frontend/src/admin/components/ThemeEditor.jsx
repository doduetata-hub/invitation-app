import { COLOR_FIELDS, FONT_OPTIONS } from '../../shared/constants/design';

export default function ThemeEditor({ templateTokens, theme, onChange }) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};

  const handleColorChange = (key, value) => {
    onChange({ ...theme, colors: { ...colors, [key]: value } });
  };

  const handleFontChange = (field, value) => {
    onChange({ ...theme, fonts: { ...fonts, [field]: value } });
  };

  const handleResetColors = () => onChange({ ...theme, colors: {} });
  const handleResetFonts = () => onChange({ ...theme, fonts: {} });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Couleurs</h3>
        <button type="button" onClick={handleResetColors} className="btn btn-ghost btn-sm">
          Réinitialiser
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.7rem', marginTop: '0.7rem' }}>
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
            <input
              type="color"
              value={colors[key] || templateTokens[key]}
              onChange={(e) => handleColorChange(key, e.target.value)}
              className="input"
            />
            {label}
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Typographies</h3>
        <button type="button" onClick={handleResetFonts} className="btn btn-ghost btn-sm">
          Réinitialiser
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.9rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
        <label className="field" style={{ flex: 1, minWidth: '220px' }}>
          Titres
          <select
            value={fonts.fontHeading || templateTokens.fontHeading}
            onChange={(e) => handleFontChange('fontHeading', e.target.value)}
            className="input"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="field" style={{ flex: 1, minWidth: '220px' }}>
          Texte
          <select
            value={fonts.fontBody || templateTokens.fontBody}
            onChange={(e) => handleFontChange('fontBody', e.target.value)}
            className="input"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
