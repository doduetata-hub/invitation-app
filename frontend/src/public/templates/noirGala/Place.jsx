import Reveal from '../royalEditorial/Reveal';
import { buildMapsUrl, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { splitAddress } from './utils';

// Lieu : carte de visite dorée (nom, adresse, point de repère) + carte Google existante.
export default function Place({ invitation }) {
  const { venueName, address, eventTime } = invitation;
  if (!venueName && !address) return null;
  const { street, reference } = splitAddress(address);
  const mapsUrl = buildMapsUrl(invitation);
  const embedUrl = buildMapsEmbedUrl(invitation);
  return (
    <section className="ng-band ng-place" aria-label="Lieu">
      <Reveal>
        <p className="ng-kicker">Le lieu</p>
        <div className="ng-card">
          <span className="ng-pin" aria-hidden="true" />
          <h2 className="ng-place__n">{venueName || street}</h2>
          {venueName && street && <p className="ng-place__a">{street}</p>}
          {reference && <p className="ng-place__r"><span>Référence</span>{reference}</p>}
          {eventTime && <p className="ng-place__t">Accueil à {eventTime}</p>}
        </div>
        {mapsUrl && (
          <a className="ng-btn" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            Ouvrir dans Google Maps<span className="ng-sr"> (nouvel onglet)</span>
          </a>
        )}
      </Reveal>
      {embedUrl && (
        <Reveal delay={100}>
          <div className="ng-map">
            <iframe title={`Carte : ${venueName || street}`} src={embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </Reveal>
      )}
    </section>
  );
}
