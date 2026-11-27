import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import InvitationPage from './InvitationPage';
import { buildDemoInvitation } from './sampleInvitation';
import { isDesigned } from './templates/registry';
import { usePageSetup } from './utils/usePageSetup';

// Réponse simulée : le formulaire réagit comme sur une vraie invitation, mais rien n'est envoyé ni enregistré.
const fakeRsvpSubmit = () => new Promise((resolve) => { setTimeout(resolve, 700); });

// Lien de démonstration public (/demo/<clé du modèle>) : le modèle tel que l'invité le verra, avec des données d'exemple.
// Aucune connexion ni base de données : tout est dans l'application.
export default function DemoInvitationPage() {
  const { key } = useParams();
  const invitation = useMemo(() => (isDesigned(key) ? buildDemoInvitation(key) : null), [key]);
  usePageSetup(invitation);

  if (!invitation) {
    return (
      <div style={styles.center}>
        <p>Ce modèle de démonstration n'existe pas.</p>
      </div>
    );
  }

  return <InvitationPage key={key} invitation={invitation} slug="demo" onRsvpSubmit={fakeRsvpSubmit} />;
}

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    color: '#6b7280',
    textAlign: 'center',
    padding: '2rem',
  },
};
