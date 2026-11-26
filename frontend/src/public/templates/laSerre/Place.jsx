import Reveal from '../soireeKit/Reveal';
import { buildMapsQuery, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { Head } from './Ornaments';
import { getText } from './texts';
import fernUrl from './assets/fern.webp';

// Carte du lieu (système de cartographie existant : coordonnées GPS ou adresse enregistrées), vue à travers une arche, et itinéraire.
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  const embed = buildMapsEmbedUrl(invitation);
  if (!embed) return null;
  const q = buildMapsQuery(invitation);
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <section className="ls-place ls-light" aria-label="Plan d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'placeEyebrow')} title={getText(invitation, 'placeTitle')}>
          {venueName && <p className="ls-place__n">{venueName}</p>}
          {address && <p className="ls-place__a">{address}</p>}
        </Head>
      </Reveal>
      <Reveal className="ls-mapwrap" delay={80}>
        <img className="ls-mapwrap__fern" src={fernUrl} alt="" aria-hidden="true" loading="lazy" />
        <div className="ls-map"><iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
      </Reveal>
      <div className="ls-center"><a className="ls-btn" href={route} target="_blank" rel="noopener noreferrer">{getText(invitation, 'routeLink')}<span className="ls-sr"> (nouvel onglet)</span></a></div>
    </section>
  );
}
