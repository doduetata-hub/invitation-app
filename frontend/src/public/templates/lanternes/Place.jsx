import Reveal from '../soireeKit/Reveal';
import { buildMapsQuery, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { Head } from './Ornaments';
import { getText } from './texts';
import lilyUrl from './assets/lily.webp';

// Carte du lieu (système de cartographie existant : coordonnées GPS ou adresse enregistrées) et itinéraire.
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  const embed = buildMapsEmbedUrl(invitation);
  if (!embed) return null;
  const q = buildMapsQuery(invitation);
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <section className="ll-place ll-light" aria-label="Plan d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'placeEyebrow')} title={getText(invitation, 'placeTitle')}>
          {venueName && <p className="ll-place__n">{venueName}</p>}
          {address && <p className="ll-place__a">{address}</p>}
        </Head>
      </Reveal>
      <Reveal className="ll-mapwrap" delay={80}>
        <div className="ll-map"><iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        <img className="ll-mapwrap__lily" src={lilyUrl} alt="" aria-hidden="true" loading="lazy" />
      </Reveal>
      <div className="ll-center"><a className="ll-btn ll-btn--solid" href={route} target="_blank" rel="noopener noreferrer">{getText(invitation, 'routeLink')}<span className="ll-sr"> (nouvel onglet)</span></a></div>
    </section>
  );
}
