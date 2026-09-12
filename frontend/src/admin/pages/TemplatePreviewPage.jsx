import { useParams, Link } from 'react-router-dom';
import InvitationPage from '../../public/InvitationPage';
import { buildSampleInvitation } from '../../public/sampleInvitation';

export default function TemplatePreviewPage() {
  const { key } = useParams();
  const invitation = buildSampleInvitation(key);

  return (
    <div>
      <div style={styles.bar}>
        <Link to="/admin/templates" style={styles.back}>← Retour aux templates</Link>
        <span style={styles.note}>Aperçu avec des données d'exemple — le RSVP n'est pas fonctionnel ici.</span>
      </div>
      <InvitationPage invitation={invitation} />
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    background: '#1c1a17',
    color: '#faf8f4',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
  },
  back: { color: '#faf8f4', textDecoration: 'none' },
  note: { color: '#a89d8a' },
};
