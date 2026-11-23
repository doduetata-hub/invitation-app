import Reveal from './Reveal';
import { buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { Flourish } from './icons';

// Carte du lieu (système de cartographie existant : coordonnées GPS ou adresse enregistrées). Nom, adresse et itinéraire sont sur la carte « soirée ».
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  const embed = buildMapsEmbedUrl(invitation);
  if (!embed) return null;
  return (
    <section className="sk-place" aria-label="Plan d'accès">
      <Reveal><h2 className="sk-script sk-h2">Plan d'accès</h2><Flourish /></Reveal>
      <Reveal className="sk-map" delay={80}>
        <iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </Reveal>
    </section>
  );
}
