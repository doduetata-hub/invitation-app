import Reveal from '../soireeKit/Reveal';
import { buildMapsQuery, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { Head } from './Ornaments';
import { getText } from './texts';
import compassUrl from './assets/stamp-compass.webp';

// Carte du lieu (système de cartographie existant : coordonnées GPS ou adresse enregistrées), tamponnée, et itinéraire.
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  const embed = buildMapsEmbedUrl(invitation);
  if (!embed) return null;
  const q = buildMapsQuery(invitation);
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <section className="em-place em-light" aria-label="Plan d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'placeEyebrow')} title={getText(invitation, 'placeTitle')}>
          {venueName && <p className="em-place__n">{venueName}</p>}
          {address && <p className="em-place__a">{address}</p>}
        </Head>
      </Reveal>
      <Reveal className="em-mapwrap" delay={80}>
        <img className="em-mapwrap__stamp" src={compassUrl} alt="" aria-hidden="true" loading="lazy" />
        <div className="em-map"><iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
      </Reveal>
      <div className="em-center"><a className="em-btn em-btn--solid" href={route} target="_blank" rel="noopener noreferrer">{getText(invitation, 'routeLink')}<span className="em-sr"> (nouvel onglet)</span></a></div>
    </section>
  );
}
