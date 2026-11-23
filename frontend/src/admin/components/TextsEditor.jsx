// Textes fixes du template choisi, modifiables par l'organisateur. Enregistrés dans theme.texts de l'invitation (aucun changement de base de
// données). Un champ laissé vide garde le texte d'origine, affiché en grisé.
export default function TextsEditor({ groups, theme, onChange }) {
  const texts = theme.texts || {};
  const customCount = Object.values(texts).filter((v) => typeof v === 'string' && v.trim()).length;

  const setText = (key, value) => {
    const next = { ...texts };
    if (value) next[key] = value;
    else delete next[key];
    onChange({ ...theme, texts: next });
  };

  const reset = () => {
    if (customCount === 0 || !window.confirm("Rétablir tous les textes d'origine du template ?")) return;
    const { texts: _removed, ...rest } = theme;
    onChange(rest);
  };

  return (
    <div className="texts-editor">
      <p className="design-hint" style={{ marginTop: 0 }}>
        Ces textes s'affichent tels quels sur l'invitation. Laissez un champ vide pour garder le texte d'origine (affiché en grisé).
        Les noms, la date, le lieu, le programme, le texte d'invitation, le dress code et le message personnel se modifient plus haut.
      </p>
      {groups.map((group, i) => (
        <details key={group.title} open={i === 0} style={{ borderBottom: '1px solid var(--color-border)', padding: '0.5rem 0' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem', padding: '0.35rem 0' }}>{group.title}</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', padding: '0.6rem 0 0.4rem' }}>
            {group.fields.map((f) => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem' }}>
                {f.label}
                {f.multiline ? (
                  <textarea
                    className="input"
                    rows={3}
                    maxLength={600}
                    value={texts[f.key] || ''}
                    placeholder={f.default}
                    onChange={(e) => setText(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className="input"
                    maxLength={200}
                    value={texts[f.key] || ''}
                    placeholder={f.default}
                    onChange={(e) => setText(f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </details>
      ))}
      <div style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={reset} disabled={customCount === 0}>Rétablir les textes d'origine</button>
        <span className="admin-muted" style={{ fontSize: '0.8rem' }}>{customCount === 0 ? 'Aucun texte modifié' : `${customCount} texte(s) modifié(s)`}</span>
      </div>
    </div>
  );
}
