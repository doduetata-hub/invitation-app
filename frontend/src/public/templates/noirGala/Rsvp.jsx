import Reveal from '../royalEditorial/Reveal';
import RsvpSection from '../../sections/RsvpSection';
import { splitNames } from './utils';

// RSVP : on RÉUTILISE le formulaire de l'application (toute la logique reste dans RsvpSection) et on l'habille (noir.css : « ng-rsvp__form »).
export default function Rsvp(props) {
  const n = splitNames(props.namesLine);
  const who = n.second ? `${n.first} et ${n.second}` : n.first;
  return (
    <section className="ng-rsvp" aria-label="Confirmer sa présence">
      <div className="ng-rsvp__in">
        <Reveal>
          <h2 className="ng-script ng-script--lg ng-script--ink">Votre réponse</h2>
          <p className="ng-rsvp__sub">{who ? `${who} souhaitent connaître votre présence.` : 'Merci de nous faire part de votre présence.'}</p>
        </Reveal>
        <div className="ng-rsvp__form">
          <RsvpSection {...props} />
        </div>
      </div>
    </section>
  );
}
