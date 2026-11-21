import Reveal from '../royalEditorial/Reveal';
import { buildMapsUrl, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { splitAddress, mediaOf } from './utils';
import { Sprig } from './ornaments';
import Pic from './Pic';

// Lieu : carte à photo (nom, adresse, point de repère, heure d'accueil) + carte Google existante, teintée noir et or.
export default function Place({ invitation }) {
  const { venueName, address, eventTime } = invitation;
  if (!venueName && !address) return null;
  const { gallery } = mediaOf(invitation);
  const photo = gallery.find((m, i) => i >= 3 && !(m.mimeType || '').startsWith('video/')) || null;
  const { street, reference } = splitAddress(address);
  const mapsUrl = buildMapsUrl(invitation);
  const embedUrl = buildMapsEmbedUrl(invitation);
  return (
    <section className="ng-place" aria-label="Lieu">
      <Sprig className="ng-sprig--tr" />
      <div className="ng-place__in">
        <Reveal><h2 className="ng-script ng-foil ng-script--lg">Le lieu</h2></Reveal>
        <Reveal delay={80}>
          <div className="ng-card">
            {photo && <div className="ng-card__photo"><Pic m={photo} sizes="(min-width: 700px) 560px, 92vw" /></div>}
            <div className="ng-card__body">
              <span className="ng-pin" aria-hidden="true" />
              <h3 className="ng-place__n">{venueName || street}</h3>
              {venueName && street && <p className="ng-place__a">{street}</p>}
              {reference && <p className="ng-place__r"><em>Point de repère</em>{reference}</p>}
              {eventTime && <p className="ng-place__t">Accueil des invités à {eventTime}</p>}
              {mapsUrl && (
                <a className="ng-btn" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  Ouvrir dans Google Maps<span className="ng-sr"> (nouvel onglet)</span>
                </a>
              )}
            </div>
          </div>
        </Reveal>
        {embedUrl && (
          <Reveal delay={100}>
            <div className="ng-map">
              <iframe title={`Carte : ${venueName || street}`} src={embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
