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

export default function InvitationPage({ invitation, slug, onRsvpSubmit }) {
  const template = getTemplate(invitation.template?.key);
  const overrides = invitation.theme || {};
  const cssVars = tokensToCssVars({ ...template.tokens, ...(overrides.colors || {}), ...(overrides.fonts || {}) });

  const sectionsOrder = overrides.sectionsOrder || DEFAULT_SECTIONS_ORDER;
  const disabledSections = new Set(overrides.disabledSections || []);
  const activeSections = sectionsOrder.filter((s) => !disabledSections.has(s));

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
