import Reveal from '../royalEditorial/Reveal';
import { buildMapsQuery, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { venueLine } from './utils';
import { Icon } from './icons';

// Lieu : nom, adresse, carte Google existante (mêmes coordonnées/adresse que le reste de l'application) et itinéraire.
export default function Place({ invitation }) {
  const { venueName } = invitation;
  const address = venueLine(invitation);
  if (!venueName && !address) return null;
  const query = buildMapsQuery(invitation);
  const route = query ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}` : null;
  const embed = buildMapsEmbedUrl(invitation);
  return (
    <section className="bge-place" aria-label="Lieu">
      <Reveal>
        <h2 className="bge-h2">Notre lieu</h2>
      </Reveal>
      <div className="bge-place__grid">
        <Reveal className="bge-place__info" delay={60}>
          <Icon name="pin" className="bge-icon bge-icon--lg" />
          <h3 className="bge-place__n">{venueName || address}</h3>
          {venueName && address && <p className="bge-place__a">{address}</p>}
          {route && (
            <a className="bge-btn" href={route} target="_blank" rel="noopener noreferrer">
              Voir l'itinéraire<Icon name="arrow" className="bge-icon bge-icon--sm" /><span className="bge-sr"> (nouvel onglet)</span>
            </a>
          )}
        </Reveal>
        {embed && (
          <Reveal className="bge-map" delay={120}>
            <iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </Reveal>
        )}
      </div>
    </section>
  );
}
