import { useCompact } from '../../hooks/useMediaQuery';

// Bloc d'une page, repliable sur téléphone et tablette. `desktopTitle={false}` : le titre ne sert qu'à l'en-tête
// repliable (le contenu porte déjà ses propres titres sur grand écran).
export default function Panel({ title, className = '', desktopTitle = true, children }) {
  const compact = useCompact();
  if (compact) {
    return (
      <details className={`editor-section panel-details ${className}`.trim()}>
        <summary>
          <h2>{title}</h2>
        </summary>
        {children}
      </details>
    );
  }
  return (
    <div className={`editor-section ${className}`.trim()}>
      {desktopTitle && <h2>{title}</h2>}
      {children}
    </div>
  );
}
