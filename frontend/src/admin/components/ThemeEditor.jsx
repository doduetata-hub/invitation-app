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
      <div className="subsection-head">
        <h3>Couleurs</h3>
        <button type="button" onClick={handleResetColors} className="btn btn-ghost btn-sm">
          Réinitialiser
        </button>
      </div>
      <div className="swatch-grid">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="swatch">
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

      <div className="subsection-head">
        <h3>Typographies</h3>
        <button type="button" onClick={handleResetFonts} className="btn btn-ghost btn-sm">
          Réinitialiser
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
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
