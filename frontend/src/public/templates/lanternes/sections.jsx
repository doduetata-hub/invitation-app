// Point d'entrée du chunk « Les Lanternes » chargé à la demande (voir index.jsx) : CSS, polices et sections.
// Le défilement vers une partie visée par le lien (#rsvp, #billet) se fait après l'ouverture (voir soireeKit/opening.js).
import './fonts.css';
import './lanternes.css';
import './gate.css';

export { default as Cover } from './Cover';
export { default as Countdown } from './Countdown';
export { default as Program } from './Program';
export { default as Gallery } from './Gallery';
export { default as Place } from './Place';
export { default as Finale } from './Finale';
export { default as Contact } from './Contact';

export function Frame({ children }) {
  return <div className="ll-root">{children}</div>;
}
