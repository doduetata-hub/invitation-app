import { getTemplate, DEFAULT_SECTIONS_ORDER } from './templates/registry';
import { tokensToCssVars } from './theme/tokens';
import CoverSection from './sections/CoverSection';
import CountdownSection from './sections/CountdownSection';
import ProgramSection from './sections/ProgramSection';
import GallerySection from './sections/GallerySection';
import MapSection from './sections/MapSection';
import RsvpSection from './sections/RsvpSection';
import ContactSection from './sections/ContactSection';
import MusicPlayer from './sections/MusicPlayer';

const DEFAULT_SECTION_COMPONENTS = {
  cover: CoverSection,
  countdown: CountdownSection,
  program: ProgramSection,
  gallery: GallerySection,
  map: MapSection,
  rsvp: RsvpSection,
  contact: ContactSection,
};

// Reflète volontairement la même condition que le "return null" de chaque section (cover et
// rsvp n'en ont pas, donc jamais vides ici) : un template comme Luxury Wedding Gold ajoute son
// propre séparateur décoratif avant CHAQUE section active, décision prise avant que la section
// elle-même ne s'exécute et ne découvre qu'elle n'a rien à afficher. Sans ce filtre, une section
// vide (ex. Galerie sans photo) garde son séparateur mais aucun contenu dessous — deux
// séparateurs se retrouvent collés l'un à l'autre entre les deux sections voisines qui, elles,
// ont du contenu.
function isEmptySection(key, invitation) {
  switch (key) {
    case 'countdown':
      return !invitation.eventDate;
    case 'program':
      return (invitation.events || []).length === 0;
    case 'gallery':
      return !(invitation.media || []).some((m) => m.type === 'gallery');
    case 'map':
      return !invitation.venueName && !invitation.address;
    case 'contact':
      return !invitation.contactPhone && !invitation.contactWhatsapp;
    default:
      return false;
  }
}

export default function InvitationPage({ invitation, slug, onRsvpSubmit }) {
  const template = getTemplate(invitation.template?.key);
  const overrides = invitation.theme || {};
  const cssVars = tokensToCssVars({ ...template.tokens, ...(overrides.colors || {}), ...(overrides.fonts || {}) });

  const sectionsOrder = overrides.sectionsOrder || DEFAULT_SECTIONS_ORDER;
  const disabledSections = new Set(overrides.disabledSections || []);
  const activeSections = sectionsOrder.filter(
    (s) => !disabledSections.has(s) && !isEmptySection(s, invitation)
  );

  const { Wrapper } = template;

  return (
    <div style={cssVars}>
      <Wrapper>
        {activeSections.map((key) => {
          // Un template peut fournir sa propre version d'une section (ex: une couverture avec
          // mise en page/décors sur mesure) ; sinon on retombe sur le composant partagé générique.
          const Section = template.sectionComponents?.[key] || DEFAULT_SECTION_COMPONENTS[key];
          if (!Section) return null;
          const rsvpProps = key === 'rsvp' ? { onSubmit: onRsvpSubmit, guestInfo: invitation.guest, slug } : {};
          return (
            <div key={key} id={key}>
              <Section invitation={invitation} {...rsvpProps} />
            </div>
          );
        })}
      </Wrapper>
      <MusicPlayer invitation={invitation} />
    </div>
  );
}
