import Reveal from './Reveal';
import { buildMapsUrl, buildMapsEmbedUrl } from '../../utils/mapsUrl';

// Lieu : nom et adresse en grand, carte existante (même intégration Google que le reste de l'application),
// lien « Ouvrir dans Google Maps ». Aucune fonction supplémentaire n'est simulée (pas d'itinéraire, pas de Waze).
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  if (!venueName && !address) return null;
  const mapsUrl = buildMapsUrl(invitation);
  const embedUrl = buildMapsEmbedUrl(invitation);

  return (
    <div className="re-band re-paper2">
      <div className="re-wrap re-place">
        <Reveal>
          <span className="re-kicker re-kicker--gold">Le lieu</span>
          <h2 className={`re-place__name${(venueName || address).length > 32 ? ' re-place__name--long' : ''}`} style={{ marginTop: '1rem' }}>{venueName || address}</h2>
          {venueName && address && <p className="re-place__addr">{address}</p>}
          {mapsUrl && (
            <div className="re-btnrow">
              <a className="re-btn re-btn--solid" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                Ouvrir dans Google Maps<span className="re-sr"> (nouvel onglet)</span>
              </a>
            </div>
          )}
        </Reveal>
        {embedUrl && (
          <Reveal delay={100}>
            <div className="re-place__map">
              <p className="re-place__fallback" aria-hidden="true">{venueName || address}</p>
              <iframe
                title={`Carte : ${venueName || address}`}
                src={embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
