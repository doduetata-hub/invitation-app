import Reveal from '../royalEditorial/Reveal';

export default function Contact({ invitation }) {
  const { contactPhone, contactWhatsapp, namesLine } = invitation;
  if (!contactPhone && !contactWhatsapp) return null;
  return (
    <section className="ng-band ng-contact" aria-label="Contact">
      <Reveal>
        <p className="ng-kicker">Une question ?</p>
        <p className="ng-contact__s">{namesLine || 'Contactez-nous'}</p>
        <div className="ng-btnrow">
          {contactWhatsapp && <a className="ng-btn" href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp<span className="ng-sr"> (nouvel onglet)</span></a>}
          {contactPhone && <a className="ng-btn" href={`tel:${contactPhone}`}>Appeler</a>}
        </div>
      </Reveal>
      <p className="ng-end">{namesLine}</p>
    </section>
  );
}
