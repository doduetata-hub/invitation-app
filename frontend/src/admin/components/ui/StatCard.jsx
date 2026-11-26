// Chiffre d'une bande de statistiques. `minor` : chiffre secondaire, masqué sur téléphone (livre d'or).
export default function StatCard({ label, value, minor }) {
  return (
    <div className={`stat-card${minor ? ' gb-stat-minor' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
