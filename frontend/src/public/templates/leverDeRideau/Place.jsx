import Reveal from '../soireeKit/Reveal';
import { buildMapsQuery, buildMapsEmbedUrl } from '../../utils/mapsUrl';
import { Head, Prop } from './Ornaments';
import { getText } from './texts';

// Carte du lieu (système de cartographie existant : coordonnées GPS ou adresse enregistrées) et itinéraire.
export default function Place({ invitation }) {
  const { venueName, address } = invitation;
  const embed = buildMapsEmbedUrl(invitation);
  if (!embed) return null;
  const q = buildMapsQuery(invitation);
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <section className="lr-place lr-light" aria-label="Plan d'accès">
      <Reveal>
        <Head eyebrow={getText(invitation, 'placeEyebrow')} title={getText(invitation, 'placeTitle')} prop="glasses">
          {venueName && <p className="lr-place__n">{venueName}</p>}
          {address && <p className="lr-place__a">{address}</p>}
        </Head>
      </Reveal>
      <Reveal className="lr-mapwrap" delay={80}>
        <div className="lr-map"><iframe title={`Carte : ${venueName || address}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        <Prop name="roses" className="lr-mapwrap__roses" />
      </Reveal>
      <div className="lr-center"><a className="lr-btn lr-btn--solid" href={route} target="_blank" rel="noopener noreferrer">{getText(invitation, 'routeLink')}<span className="lr-sr"> (nouvel onglet)</span></a></div>
    </section>
  );
}
