import Reveal from './Reveal';
import RsvpSection from '../../sections/RsvpSection';
import { splitNames } from './utils';

// RSVP : on RÉUTILISE le formulaire de l'application (envoi, états, verrou de modification, QR d'entrée, photo du livre d'or…
// restent exactement ceux de RsvpSection — aucune logique dupliquée) et on l'habille de la direction artistique
// (voir « re-rsvp__form » dans royal.css). Cela évite de reproduire une fonctionnalité sensible et garde un seul code de vérité.
export default function Rsvp(props) {
  const names = splitNames(props.namesLine);
  const who = names.second ? `${names.first} et ${names.second}` : names.first;
  return (
    <div className="re-band re-paper2" style={{ borderTop: '1px solid var(--re-line)' }}>
      <div className="re-wrap re-rsvp">
        <Reveal className="re-rsvp__side">
          <span className="re-kicker re-kicker--gold">R.S.V.P.</span>
          <h2 className="re-h2">Votre réponse</h2>
          <p className="re-muted" style={{ maxWidth: '28em' }}>
            {who ? `${who} souhaitent connaître votre présence.` : 'Merci de nous faire part de votre présence.'}
          </p>
        </Reveal>
        <div className="re-rsvp__form">
          <RsvpSection {...props} />
        </div>
      </div>
    </div>
  );
}
