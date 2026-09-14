import { injectStylesOnce } from '../../utils/injectStyles';
import { buildMapsUrl } from '../../utils/mapsUrl';
import { CalendarIcon, ClockIcon, PinIcon, MapIcon, HeartIcon, ChevronDownIcon, DiamondIcon } from './icons';
import leafBranchLeft from './assets/leaf-branch-left.webp';
import leafBranchRight from './assets/leaf-branch-right.webp';
import ornamentDivider from './assets/ornament-divider.webp';

injectStylesOnce(
  'luxury-gold-anim',
  `
  @keyframes luxuryGoldRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes luxuryGoldBounce { 0%, 100% { transform: translateY(0); opacity: 0.55; } 50% { transform: translateY(6px); opacity: 1; } }
  .luxury-gold-fade { animation: luxuryGoldRise 700ms ease-out both; }
  .luxury-gold-fade--delay1 { animation-delay: 140ms; }
  .luxury-gold-fade--delay2 { animation-delay: 280ms; }
  .luxury-gold-fade--delay3 { animation-delay: 400ms; }
  .luxury-gold-scrollcue { animation: luxuryGoldBounce 2200ms ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .luxury-gold-fade, .luxury-gold-fade--delay1, .luxury-gold-fade--delay2, .luxury-gold-fade--delay3 { animation: none; }
    .luxury-gold-scrollcue { animation: none; }
  }
  `
);

// Motto décoratif du gabarit : voix du template, jamais liée à un couple précis
// (aucun champ de données n'a vocation à porter ce type de phrase générique).
const TEMPLATE_MOTTO = 'Un amour • Une vie • Pour toujours';
const DEFAULT_CLOSING_LINE = 'Votre présence nous ferait grand plaisir';

// Coupures acceptées pour scinder « namesLine » en deux prénoms empilés.
const NAME_SEPARATORS = [' & ', ' et ', ' + ', '&'];

function splitNames(namesLine) {
  if (!namesLine) return null;
  for (const sep of NAME_SEPARATORS) {
    const idx = namesLine.indexOf(sep);
    if (idx > 0 && idx < namesLine.length - sep.length) {
      return {
        first: namesLine.slice(0, idx).trim(),
        second: namesLine.slice(idx + sep.length).trim(),
      };
    }
  }
  return null;
}

// Taille dépendante de la longueur du texte plutôt que de vw : la carte a une largeur
// maximale fixe (480px) quel que soit l'écran, donc une taille relative au viewport
// se désynchronise du conteneur réel (c'est ce qui provoquait la coupure des noms
// dans l'aperçu admin, plus étroit que la fenêtre du navigateur).
function fitFontSize(text) {
  const len = (text || '').length;
  if (len > 18) return '1.5rem';
  if (len > 13) return '1.85rem';
  if (len > 9) return '2.2rem';
  return '2.7rem';
}

function InfoCell({ icon, label, sub, href, isLast }) {
  const content = (
    <>
      <span style={styles.infoIcon}>{icon}</span>
      <span style={styles.infoLabel}>{label}</span>
      {sub && <span style={styles.infoSub}>{sub}</span>}
    </>
  );
  return (
    <div style={{ ...styles.infoCell, borderRight: isLast ? 'none' : '1px solid rgba(169,120,46,0.35)' }}>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ ...styles.infoCellInner, textDecoration: 'none' }}>
          {content}
        </a>
      ) : (
        <div style={styles.infoCellInner}>{content}</div>
      )}
    </div>
  );
}

export default function LuxuryGoldCoverSection({ invitation }) {
  const { title, namesLine, eventDate, eventTime, venueName, address, invitationText, personalMessage } = invitation;
  const coverUrl = (invitation.media || []).find((m) => m.type === 'cover')?.url;
  const mapsUrl = buildMapsUrl(invitation);
  const namePair = splitNames(namesLine);

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const infoCells = [
    formattedDate && { icon: <CalendarIcon />, label: 'Date', sub: formattedDate },
    eventTime && { icon: <ClockIcon />, label: 'Heure', sub: eventTime },
    venueName && { icon: <PinIcon />, label: 'Lieu', sub: venueName },
    mapsUrl && { icon: <MapIcon />, label: 'Itinéraire', sub: 'Voir la carte', href: mapsUrl },
  ].filter(Boolean);

  return (
    // Racine sans max-width : contrairement à <section> (plafonnée à 480px pour le texte/la
    // carte), ce conteneur hérite de la largeur réelle du rendu (page publique ou boîte
    // d'aperçu admin Mobile/Tablette/Desktop), ce qui permet aux feuillages de rejoindre les
    // deux bords de l'écran sans dépendre de vw (qui ignorerait la boîte d'aperçu admin).
    <div style={styles.heroRoot}>
      {/* Arche du portail-photo : un chemin en coordonnées relatives (objectBoundingBox)
          qui s'adapte à n'importe quelle taille de photo, donc réutilisable pour tout couple. */}
      <svg width="0" height="0" style={styles.svgDefs} aria-hidden="true">
        <defs>
          <clipPath id="luxGoldArch" clipPathUnits="objectBoundingBox">
            <path d="M0,1 L0,0.48 C0,0.19 0.22,0 0.5,0 C0.78,0 1,0.19 1,0.48 L1,1 Z" />
          </clipPath>
        </defs>
      </svg>

      <div style={styles.leafDecor} aria-hidden="true" className="luxury-gold-fade luxury-gold-fade--delay1">
        <img src={leafBranchLeft} alt="" style={styles.leafEdgeLeft} />
        <img src={leafBranchRight} alt="" style={styles.leafEdgeRight} />
      </div>

      <section style={styles.section}>
        <div style={styles.motto} className="luxury-gold-fade">
          <p style={styles.mottoText}>{TEMPLATE_MOTTO}</p>
          <DiamondIcon style={styles.mottoDiamond} aria-hidden="true" />
        </div>

        <div style={styles.stage}>
          <div style={styles.photoZone} className="luxury-gold-fade luxury-gold-fade--delay1">
            <div style={styles.photoFrame}>
              {coverUrl ? (
                <img src={coverUrl} alt="" style={styles.photoImg} />
              ) : (
                <div style={styles.photoPlaceholder}>
                  <HeartIcon style={styles.placeholderIcon} />
                </div>
              )}
            </div>
          </div>

          <div style={styles.card}>
            <img src={leafBranchLeft} alt="" aria-hidden="true" style={styles.leafBottomLeft} />
            <img src={leafBranchRight} alt="" aria-hidden="true" style={styles.leafBottomRight} />

            {title && (
              <p style={styles.eyebrow} className="luxury-gold-fade luxury-gold-fade--delay2">
                {title}
              </p>
            )}
            <DiamondIcon style={styles.eyebrowDiamond} aria-hidden="true" />

            {namesLine && (
              <div style={styles.namesStack} className="luxury-gold-fade luxury-gold-fade--delay2">
                {namePair ? (
                  <>
                    <span style={{ ...styles.nameWord, fontSize: fitFontSize(namePair.first) }}>{namePair.first}</span>
                    <span style={styles.ampersand} aria-hidden="true">&amp;</span>
                    <span style={{ ...styles.nameWord, fontSize: fitFontSize(namePair.second) }}>{namePair.second}</span>
                  </>
                ) : (
                  <span style={{ ...styles.nameWord, fontSize: fitFontSize(namesLine) }}>{namesLine}</span>
                )}
              </div>
            )}

            {/* L'encadré d'infos (avec son seul lien cliquable, "Itinéraire") est placé ici,
                juste après les noms, plutôt qu'en bas de carte : le lecteur audio flottant
                (position fixed, bas-droit) ne peut pas être personnalisé par template sans
                toucher au composant partagé — le mettre hors de la zone basse de la carte,
                où lui seul peut apparaître, évite tout chevauchement sans jamais comprimer
                ni redimensionner ce bloc. */}
            {infoCells.length > 0 && (
              <>
                <img src={ornamentDivider} alt="" aria-hidden="true" style={styles.ornament} />
                <div style={styles.infoRow} className="luxury-gold-fade luxury-gold-fade--delay3">
                  {infoCells.map((cell, i) => (
                    <InfoCell key={cell.label} {...cell} isLast={i === infoCells.length - 1} />
                  ))}
                </div>
              </>
            )}

            {invitationText && (
              <p style={styles.invitationText} className="luxury-gold-fade luxury-gold-fade--delay2">
                {invitationText}
              </p>
            )}

            {address && <p style={styles.address}>{address}</p>}

            <p style={styles.closingLine}>{personalMessage || DEFAULT_CLOSING_LINE}</p>

            <div style={styles.scrollCue} className="luxury-gold-scrollcue" aria-hidden="true">
              <ChevronDownIcon style={styles.scrollCueIcon} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  // Pas de max-width ici : ce conteneur doit refléter la largeur réelle du rendu (page
  // publique ou boîte d'aperçu admin), contrairement à `section` plafonnée à 480px.
  heroRoot: { position: 'relative', width: '100%' },
  section: { padding: '1.75rem 1.1rem 1.5rem', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  svgDefs: { position: 'absolute' },

  // Feuillages ancrés aux bords réels du conteneur (left:0/right:0, largeur en % + plafond
  // en px — jamais en vw) : sur mobile le conteneur est déjà quasi plein écran donc le rendu
  // ne change pas, mais sur tablette/desktop (page réelle ou boîte d'aperçu admin élargie)
  // ils s'étirent pour rejoindre les deux bords au lieu de rester petits près de la carte.
  leafDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 0, pointerEvents: 'none', zIndex: 0 },
  leafEdgeLeft: { position: 'absolute', top: '4.4rem', left: 0, width: '108px', height: 'auto', opacity: 0.85 },
  leafEdgeRight: { position: 'absolute', top: '4.4rem', right: 0, width: '108px', height: 'auto', opacity: 0.85 },

  motto: { textAlign: 'center', marginBottom: '1.1rem' },
  mottoText: { textTransform: 'uppercase', letterSpacing: '0.24em', fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' },
  mottoDiamond: { width: '8px', height: '8px', color: 'var(--color-secondary)' },

  stage: { position: 'relative', width: '100%' },

  // La photo porte elle-même l'arche (portail à côtés droits + sommet en arc) : c'est une
  // forme fixe (aspect-ratio verrouillé), donc jamais dépendante de la longueur d'un texte.
  photoZone: { position: 'relative', width: '78%', margin: '0 auto', zIndex: 1 },
  photoFrame: {
    aspectRatio: '1 / 1.25',
    clipPath: 'url(#luxGoldArch)',
    overflow: 'hidden',
    border: '4px solid var(--color-secondary)',
    boxShadow: '0 16px 34px rgba(46,32,19,0.22)',
  },
  // Léger zoom (au-delà du cadrage cover naturel) : la photo remplit davantage l'arche,
  // recadrée par le overflow:hidden du cadre — fonctionne pour n'importe quelle photo,
  // portrait ou paysage, sans jamais la déformer (toujours object-fit: cover en dessous).
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%', display: 'block', transform: 'scale(1.09)' },
  photoPlaceholder: { width: '100%', height: '100%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: '2.5rem', color: 'var(--color-secondary)', opacity: 0.5 },

  // Simple rectangle à coins arrondis : aucun clip-path sur la carte, donc aucune limite
  // de hauteur — le contenu (texte long, nombreuses infos) grandit toujours librement.
  card: {
    position: 'relative',
    zIndex: 2,
    marginTop: '-7%',
    width: '100%',
    background: 'var(--color-surface)',
    border: '1.5px solid var(--color-secondary)',
    borderRadius: '44px 44px 20px 20px',
    padding: '2.5rem 1.5rem 1.75rem',
    textAlign: 'center',
    boxShadow: '0 10px 26px rgba(46,32,19,0.14)',
  },
  // Contrairement au feuillage du haut (qui a de la marge grâce à la photo plus étroite
  // que la carte), la carte occupe presque toute la largeur du viewport sur mobile : un
  // décalage négatif ferait sortir ces feuillages de l'écran. On les ancre donc à
  // l'intérieur des coins bas de la carte plutôt qu'en débordement.
  leafBottomLeft: { position: 'absolute', bottom: '0.4rem', left: '0.4rem', width: '22%', height: 'auto', opacity: 0.75, pointerEvents: 'none' },
  leafBottomRight: { position: 'absolute', bottom: '0.4rem', right: '0.4rem', width: '22%', height: 'auto', opacity: 0.75, pointerEvents: 'none' },

  eyebrow: { textTransform: 'uppercase', letterSpacing: '0.28em', fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem', position: 'relative' },
  eyebrowDiamond: { width: '7px', height: '7px', color: 'var(--color-secondary)', margin: '0 0 0.9rem' },
  namesStack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' },
  nameWord: {
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-text)',
    lineHeight: 1.12,
    margin: 0,
    maxWidth: '100%',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
  ampersand: { fontFamily: 'var(--font-heading)', fontStyle: 'italic', color: 'var(--color-secondary)', fontSize: '1.15rem', margin: '0.1rem 0' },

  invitationText: {
    fontFamily: 'var(--font-body)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: '0.8rem',
    lineHeight: 1.7,
    margin: '1.1rem 0 0',
    overflowWrap: 'break-word',
  },
  address: { fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 0', overflowWrap: 'break-word' },

  ornament: { display: 'block', margin: '1.3rem auto 1rem', height: '18px', width: 'auto' },

  infoRow: {
    display: 'flex',
    border: '1px solid var(--color-secondary)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  infoCell: { flex: 1, minWidth: 0 },
  infoCellInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0.85rem 0.4rem', color: 'var(--color-text)' },
  infoIcon: { fontSize: '1.15rem', color: 'var(--color-secondary)', display: 'flex' },
  infoLabel: { fontFamily: 'var(--font-body)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', overflowWrap: 'break-word' },
  infoSub: { fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.25, overflowWrap: 'break-word', maxWidth: '100%' },

  closingLine: {
    fontFamily: 'var(--font-body)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    margin: '1.5rem 0 0',
    overflowWrap: 'break-word',
  },

  scrollCue: { marginTop: '0.9rem', display: 'flex', justifyContent: 'center', color: 'var(--color-secondary)' },
  scrollCueIcon: { fontSize: '1.3rem' },
};
