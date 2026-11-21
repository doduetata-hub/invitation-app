import Reveal from '../royalEditorial/Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials } from './utils';

// Contacts (uniquement ceux de l'organisateur) puis signature : monogramme en relief, noms en script, date.
export default function Contact({ invitation }) {
  const { contactPhone, contactWhatsapp, namesLine, eventDate } = invitation;
  if (!contactPhone && !contactWhatsapp) return null;
  const nm = splitNames(namesLine);
  const ini = initials(nm);
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <section className="ng-contact" aria-label="Contact">
      <span className="ng-contact__ghost" aria-hidden="true">{ini.f}{ini.s}</span>
      <Reveal className="ng-contact__in">
        <p className="ng-label">Une question ?</p>
        <div className="ng-btnrow">
          {contactWhatsapp && <a className="ng-btn" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp<span className="ng-sr"> (nouvel onglet)</span></a>}
          {contactPhone && <a className="ng-btn" href={`tel:${contactPhone}`}>Appeler</a>}
        </div>
        <p className="ng-script ng-foil ng-script--lg ng-contact__s">{nm.second ? (<>{nm.first} <span className="ng-amp2">&amp;</span> {nm.second}</>) : namesLine}</p>
        {date && <p className="ng-label ng-cap">{date}</p>}
      </Reveal>
    </section>
  );
}
