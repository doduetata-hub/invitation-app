import Reveal from '../soireeKit/Reveal';
import { buildMapsQuery, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { Head } from './Ornaments';
import { getText } from './texts';

// Carte du lieu (système de cartographie existant : coordonnées GPS ou adresse enregistrées) et itinéraire.
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  const embed = buildMapsEmbedUrl(invitation);
  if (!embed) return null;
  const q = buildMapsQuery(invitation);
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <section className="lp-place" aria-label="Plan d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'placeEyebrow')} title={getText(invitation, 'placeTitle')}>
          {venueName && <p className="lp-place__n">{venueName}</p>}
          {address && <p className="lp-place__a">{address}</p>}
        </Head>
      </Reveal>
      <Reveal className="lp-map" delay={80}>
        <iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </Reveal>
      <div className="lp-center"><a className="lp-btn" href={route} target="_blank" rel="noopener noreferrer">{getText(invitation, 'routeLink')}<span className="lp-sr"> (nouvel onglet)</span></a></div>
    </section>
  );
}
