export const PREVIEW_MODES = [
  { id: 'mobile', label: 'Mobile' },
  { id: 'tablet', label: 'Tablette' },
  { id: 'desktop', label: 'Desktop' },
];

export default function PreviewModes({ value, onChange }) {
  return (
    <div className="preview-modes" role="group" aria-label="Taille de l'aperçu">
      {PREVIEW_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          aria-pressed={value === m.id}
          className={`preview-mode-btn${value === m.id ? ' is-active' : ''}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
