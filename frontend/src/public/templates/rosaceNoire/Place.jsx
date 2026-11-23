import Reveal from '../soireeKit/Reveal';
import { buildMapsQuery, buildMapsEmbedUrl } from '../../utils/mapsUrl';

// Carte du lieu (système de cartographie existant : coordonnées GPS ou adresse enregistrées) et itinéraire.
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  const embed = buildMapsEmbedUrl(invitation);
  if (!embed) return null;
  const q = buildMapsQuery(invitation);
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <section className="nv-place" aria-label="Plan d'accès">
      <Reveal>
        <p className="nv-eyebrow nv-eyebrow--ink">Comment nous rejoindre</p>
        <h2 className="nv-h2">Le lieu<br /><em>de la célébration.</em></h2>
        {venueName && <p className="nv-place__n">{venueName}</p>}
        {address && <p className="nv-place__a">{address}</p>}
      </Reveal>
      <Reveal className="nv-map" delay={80}>
        <iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </Reveal>
      <div className="nv-center"><a className="nv-btn" href={route} target="_blank" rel="noopener noreferrer">Voir l'itinéraire<span className="nv-sr"> (nouvel onglet)</span></a></div>
    </section>
  );
}
