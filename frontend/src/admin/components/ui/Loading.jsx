export default function Loading({ label = 'Chargement...' }) {
  return (
    <div className="loading" role="status">
      {label}
    </div>
  );
}
