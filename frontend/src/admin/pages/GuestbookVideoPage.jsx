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
  const supported = isBrowserSupported();

  useEffect(() => {
    api.get(`/invitations/${id}`).then(setInvitation).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!invitation?.slug) return;
    api
      .get(`/guestbook/display/${invitation.slug}`)
      .then(setDisplay)
      .catch((err) => setError(err.message));
  }, [invitation?.slug]);

  const start = async () => {
    if (!display) return;
    setError('');
    setVideoUrl(null);
    setPhase('preload');
    setProgress({ current: 0, total: 1 });
    try {
      const timeline = buildGuestbookVideoTimeline({
        namesLine: display.namesLine,
        title: display.title,
        entries: display.entries,
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
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const entryCount = display?.entries?.length ?? 0;
  const downloadName = invitation ? `livre-or-${invitation.slug}.mp4` : 'livre-or.mp4';

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <Link to={`/admin/invitations/${id}/guestbook`} className="btn btn-outline btn-sm">← Retour au livre d'or</Link>
        {display && phase === 'idle' && (
          <button type="button" onClick={start} className="btn btn-primary btn-sm" disabled={!supported}>
            🎬 Générer la vidéo ({entryCount} message{entryCount > 1 ? 's' : ''})
          </button>
        )}
        {phase === 'done' && (
          <button type="button" onClick={start} className="btn btn-outline btn-sm">
            ↺ Régénérer
          </button>
        )}
      </div>

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
  canvasWrap: { width: '100%', maxWidth: '900px', background: '#0A0908', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(20,16,10,0.25)' },
  canvas: { width: '100%', height: 'auto', display: 'block' },
  progressWrap: { width: '100%', maxWidth: '900px', marginTop: '1.2rem', textAlign: 'center' },
  progressTrack: { width: '100%', height: '10px', borderRadius: '999px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  progressBar: { height: '100%', background: '#B88A32', transition: 'width 200ms ease' },
  resultWrap: { width: '100%', maxWidth: '900px', marginTop: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  videoPreview: { width: '100%', borderRadius: '6px', background: '#000' },
};
