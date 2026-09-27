import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { buildGuestbookVideoTimeline } from '../../shared/video/guestbookVideoTimeline';
import { generateGuestbookVideo, VIDEO_WIDTH, VIDEO_HEIGHT } from '../../shared/video/guestbookVideoEncoder';

const PHASE_LABELS = {
  preload: 'Préparation des photos...',
  'load-ffmpeg': 'Chargement du moteur vidéo...',
  render: 'Rendu des images...',
  encode: 'Encodage en MP4...',
  'reload-ffmpeg': 'Redémarrage du moteur vidéo (libère la mémoire)...',
  mux: 'Assemblage final et ajout de la musique...',
};

// Détection minimale (canvas + Worker) : pas un test exhaustif, juste de quoi éviter un
// plantage silencieux sur un navigateur manifestement trop ancien plutôt que de laisser
// l'admin cliquer dans le vide.
function isBrowserSupported() {
  try {
    const canvas = document.createElement('canvas');
    return typeof canvas.getContext === 'function' && typeof window.Worker !== 'undefined';
  } catch {
    return false;
  }
}

function formatDuration(totalSeconds) {
  const s = Math.round(totalSeconds);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m} min ${rest.toString().padStart(2, '0')} s` : `${rest} s`;
}

// Génère, entièrement dans le navigateur de l'admin (jamais sur le serveur — voir le plan pour
// le raisonnement : l'encodage vidéo est bien trop long pour une fonction Vercel), un souvenir
// vidéo animé du livre d'or : mêmes données que le mode écran
// (GET /api/guestbook/display/:slug), mêmes couleurs "Smoking & Doré" que le PDF, mais un rendu
// dessiné image par image dans un <canvas> puis encodé en MP4 par ffmpeg.wasm (voir
// guestbookVideoEncoder.js).
export default function GuestbookVideoPage() {
  const { id } = useParams();
  const canvasRef = useRef(null);
  const [invitation, setInvitation] = useState(null);
  const [display, setDisplay] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoSize, setVideoSize] = useState(0);
  const [selectedIds, setSelectedIds] = useState(null);
  const supported = isBrowserSupported();

  useEffect(() => {
    api.get(`/invitations/${id}`).then(setInvitation).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!invitation?.slug) return;
    api
      .get(`/guestbook/display/${invitation.slug}`)
      .then((d) => {
        setDisplay(d);
        // Tout sélectionné par défaut : l'admin retire ce qu'il ne veut pas, plutôt que de tout
        // recocher lui-même — surtout utile pour un petit livre d'or, où tout garder est le choix
        // naturel. Pour un gros, la durée estimée affichée juste en dessous l'incite vite à trier.
        setSelectedIds(new Set(d.entries.map((e) => e.id)));
      })
      .catch((err) => setError(err.message));
  }, [invitation?.slug]);

  const toggleEntry = (entryId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(display.entries.map((e) => e.id)));
  const selectNone = () => setSelectedIds(new Set());

  const selectedEntries = display && selectedIds ? display.entries.filter((e) => selectedIds.has(e.id)) : [];
  const estimatedTimeline = display
    ? buildGuestbookVideoTimeline({ namesLine: display.namesLine, title: display.title, entries: selectedEntries })
    : null;

  const start = async () => {
    if (!display || selectedEntries.length === 0) return;
    setError('');
    setVideoUrl(null);
    setPhase('preload');
    setProgress({ current: 0, total: 1 });
    try {
      const timeline = buildGuestbookVideoTimeline({
        namesLine: display.namesLine,
        title: display.title,
        entries: selectedEntries,
      });
      const blob = await generateGuestbookVideo({
        canvas: canvasRef.current,
        timeline,
        coverUrl: display.coverUrl,
        musicUrl: display.musicUrl,
        onProgress: ({ phase: p, current, total }) => {
          setPhase(p);
          setProgress({ current, total });
        },
      });
      setVideoUrl(URL.createObjectURL(blob));
      setVideoSize(blob.size);
      setPhase('done');
    } catch (err) {
      setError(err.message || 'La génération a échoué.');
      setPhase('error');
    }
  };

  const isRunning = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  // Certains navigateurs (Chrome notamment, via son "économiseur de mémoire") déchargent
  // silencieusement un onglet d'arrière-plan gourmand en mémoire — au retour, la page est
  // rechargée de zéro, sans erreur ni message : toute la progression disparaît d'un coup, comme
  // si "ça avait planté". La génération étant gourmande (photos décodées, images de la vidéo),
  // c'est exactement le genre d'onglet visé. On ne peut pas empêcher ce déchargement depuis la
  // page elle-même, mais on peut au moins prévenir avant qu'il ne surprenne, et intercepter une
  // fermeture/navigation volontaire pendant que ça tourne.
  useEffect(() => {
    if (!isRunning) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isRunning]);

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const entryCount = display?.entries?.length ?? 0;
  const downloadName = invitation ? `livre-or-${invitation.slug}.mp4` : 'livre-or.mp4';

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <Link to={`/admin/invitations/${id}/guestbook`} className="btn btn-outline btn-sm">← Retour au livre d'or</Link>
        {display && phase === 'idle' && (
          <button type="button" onClick={start} className="btn btn-primary btn-sm" disabled={!supported || selectedEntries.length === 0}>
            🎬 Générer la vidéo ({selectedEntries.length} message{selectedEntries.length > 1 ? 's' : ''})
          </button>
        )}
        {phase === 'done' && (
          <button type="button" onClick={start} className="btn btn-outline btn-sm">
            ↺ Régénérer
          </button>
        )}
      </div>

      {display && phase === 'idle' && supported && (
        <p className="admin-muted" style={{ maxWidth: '900px', textAlign: 'center' }}>
          ⚠️ Une fois lancée, garde cet onglet ouvert et actif à l'écran jusqu'à la fin (ne
          bascule pas sur un autre onglet ou une autre application) : certains navigateurs
          déchargent en mémoire les onglets d'arrière-plan pendant un traitement long, ce qui
          efface la progression sans prévenir.
        </p>
      )}
      {isRunning && (
        <p className="admin-muted" style={{ maxWidth: '900px', textAlign: 'center' }}>
          ⚠️ Ne change pas d'onglet ni d'application avant la fin, sous peine de perdre la
          progression.
        </p>
      )}

      {!supported && (
        <p className="error-text">
          Ton navigateur ne permet pas de générer cette vidéo — essaie avec une version récente
          de Chrome ou Edge.
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      {!error && display && entryCount === 0 && (
        <p className="admin-muted">Aucun message approuvé pour le moment : la vidéo n'aurait que l'introduction et la conclusion.</p>
      )}

      {display && phase === 'idle' && entryCount > 0 && (
        <div style={styles.selectionPanel}>
          <div style={styles.selectionHeader}>
            <h3 style={{ margin: 0 }}>Messages à inclure ({selectedEntries.length}/{entryCount})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={selectAll} className="btn btn-outline btn-sm">Tout sélectionner</button>
              <button type="button" onClick={selectNone} className="btn btn-outline btn-sm">Tout désélectionner</button>
            </div>
          </div>
          <p className="admin-muted" style={{ margin: '0.3rem 0 0.9rem' }}>
            Durée estimée : environ {formatDuration(estimatedTimeline.totalDuration)}
            {estimatedTimeline.totalDuration > 480 && (
              <> — une vidéo aussi longue risque de ne jamais être regardée en entier ; envisage de n'en garder que les messages les plus marquants.</>
            )}
          </p>
          <div style={styles.entryList}>
            {display.entries.map((entry) => (
              <label key={entry.id} style={styles.entryRow}>
                <input
                  type="checkbox"
                  checked={selectedIds?.has(entry.id) ?? false}
                  onChange={() => toggleEntry(entry.id)}
                  style={{ marginTop: '0.2rem' }}
                />
                {entry.photo && (
                  <img src={entry.photo.thumbUrl || entry.photo.url} alt="" style={styles.entryThumb} />
                )}
                <span style={styles.entryText}>
                  <strong>{entry.guestName || 'Un invité'}</strong>
                  <span className="admin-muted">
                    {' — '}
                    {entry.message.length > 90 ? `${entry.message.slice(0, 90)}…` : entry.message}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={styles.canvasWrap}>
        <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} style={styles.canvas} />
      </div>

      {isRunning && (
        <div style={styles.progressWrap}>
          <p className="admin-muted" style={{ margin: '0 0 0.5rem' }}>{PHASE_LABELS[phase] || 'Préparation...'}</p>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressBar, width: `${percent}%` }} />
          </div>
          <p className="admin-muted" style={{ margin: '0.4rem 0 0' }}>{percent}%</p>
        </div>
      )}

      {phase === 'done' && videoUrl && (
        <div style={styles.resultWrap}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={videoUrl} controls style={styles.videoPreview} />
          <a href={videoUrl} download={downloadName} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Télécharger le MP4 ({(videoSize / (1024 * 1024)).toFixed(1)} Mo)
          </a>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#e9e2d0', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  toolbar: { display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', width: '100%', maxWidth: '900px', justifyContent: 'space-between', flexWrap: 'wrap' },
  selectionPanel: { width: '100%', maxWidth: '900px', background: '#FFFDF8', border: '1px solid #e4d9bd', borderRadius: '6px', padding: '1rem 1.2rem', marginBottom: '1.2rem' },
  selectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' },
  entryList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' },
  entryRow: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' },
  entryThumb: { width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', flex: 'none' },
  entryText: { flex: 1, lineHeight: 1.4 },
  canvasWrap: { width: '100%', maxWidth: '900px', background: '#0A0908', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(20,16,10,0.25)' },
  canvas: { width: '100%', height: 'auto', display: 'block' },
  progressWrap: { width: '100%', maxWidth: '900px', marginTop: '1.2rem', textAlign: 'center' },
  progressTrack: { width: '100%', height: '10px', borderRadius: '999px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  progressBar: { height: '100%', background: '#B88A32', transition: 'width 200ms ease' },
  resultWrap: { width: '100%', maxWidth: '900px', marginTop: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  videoPreview: { width: '100%', borderRadius: '6px', background: '#000' },
};
