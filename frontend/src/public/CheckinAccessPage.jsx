import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { api } from '../shared/api/client';

function extractGuestCode(scannedText) {
  try {
    const url = new URL(scannedText);
    return url.searchParams.get('guest');
  } catch {
    return null;
  }
}

// Page publique (aucune connexion admin) scopée par un token DISTINCT de celui de
// ClientAccessPage.jsx : volontairement séparée pour qu'un client puisse déléguer le SEUL
// contrôle d'entrée jour J à une tierce personne (celle qui filtre la porte) sans jamais lui
// donner le pouvoir de créer, modifier ou supprimer un invité — juste scanner/rechercher et
// pointer une arrivée.
export default function CheckinAccessPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [cameraError, setCameraError] = useState('');
  const [scanState, setScanState] = useState('scanning'); // scanning | found | not-found
  const [found, setFound] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const scanStateRef = useRef('scanning');

  const load = useCallback(() => {
    api
      .get(`/checkin-access/${token}`)
      .then(setData)
      .catch(() => setNotFound(true));
  }, [token]);

  useEffect(load, [load]);

  const handleScan = useCallback(
    async (text) => {
      const code = extractGuestCode(text);
      if (!code) return;

      scanStateRef.current = 'found';
      setScanState('found');
      try {
        const guest = await api.get(`/checkin-access/${token}/lookup?code=${encodeURIComponent(code)}`);
        setFound(guest);
      } catch {
        setFound(null);
        setScanState('not-found');
        scanStateRef.current = 'not-found';
      }
    },
    [token]
  );

  useEffect(() => {
    let stopped = false;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (scanStateRef.current === 'scanning' && video && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data) {
          handleScan(result.data);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err) {
        setCameraError(err.message || "Impossible d'accéder à la caméra");
      }
    }

    start();

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [handleScan]);

  const resumeScanning = () => {
    setFound(null);
    setScanState('scanning');
    scanStateRef.current = 'scanning';
  };

  const confirmArrival = async () => {
    setConfirming(true);
    try {
      await api.post(`/checkin-access/${token}/guests/${found.id}/checkin`);
      load();
      setTimeout(resumeScanning, 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const toggleManualCheckIn = async (guestId, isCheckedIn) => {
    try {
      if (isCheckedIn) {
        await api.delete(`/checkin-access/${token}/guests/${guestId}/checkin`);
      } else {
        await api.post(`/checkin-access/${token}/guests/${guestId}/checkin`);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (notFound) {
    return (
      <div style={styles.center}>
        <p>Ce lien n'est plus valide. Demande un nouveau lien à l'organisateur.</p>
      </div>
    );
  }

  if (!data) {
    return <div style={styles.center}>Chargement...</div>;
  }

  const { guests, stats, invitation } = data;
  const q = search.trim().toLowerCase();
  const filteredGuests = guests.filter((g) => (g.rsvp?.name || g.name || '').toLowerCase().includes(q));

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <p className="admin-eyebrow">{invitation.title}</p>
        <h1 style={{ margin: '0.3rem 0 1.25rem' }}>{invitation.namesLine || 'Check-in'}</h1>

        {error && <p className="error-text">{error}</p>}

        <div className="stats-grid">
          <StatCard label="Total invités" value={stats.totalGuests} />
          <StatCard label="Confirmés" value={stats.confirmed} />
          <StatCard label="Arrivés" value={stats.arrived} />
        </div>

        <div className="editor-section">
          <h2>Scanner un QR code</h2>
          {cameraError ? (
            <div className="empty-state">
              Caméra indisponible : {cameraError}. Utilise la recherche manuelle ci-dessous.
            </div>
          ) : (
            <div style={styles.scannerWrap}>
              <video ref={videoRef} muted playsInline style={styles.video} />
              {scanState === 'scanning' && <div style={styles.scanHint}>Visez le QR code de l'invité</div>}

              {scanState === 'found' && found && (
                <div style={styles.overlay}>
                  <div style={styles.overlayCard}>
                    <h3 style={{ margin: 0 }}>{found.name || 'Invité'}</h3>
                    {found.rsvp ? (
                      <p className="admin-muted" style={{ margin: '0.4rem 0' }}>
                        {found.rsvp.answer === 'YES' ? `Confirmé — ${found.rsvp.numberOfPersons} personne(s)` : 'A décliné'}
                      </p>
                    ) : (
                      <p className="admin-muted" style={{ margin: '0.4rem 0' }}>Pas encore répondu au RSVP</p>
                    )}
                    {found.maxPersons != null && <p className="admin-muted" style={{ margin: 0 }}>Max {found.maxPersons} personne(s)</p>}

                    {found.checkedInAt ? (
                      <p className="success-text" style={{ marginTop: '0.75rem' }}>Déjà enregistré à {new Date(found.checkedInAt).toLocaleTimeString('fr-FR')}</p>
                    ) : null}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      {!found.checkedInAt && (
                        <button type="button" onClick={confirmArrival} disabled={confirming} className="btn btn-primary">
                          {confirming ? '...' : "Confirmer l'arrivée"}
                        </button>
                      )}
                      <button type="button" onClick={resumeScanning} className="btn btn-outline">
                        Scanner le suivant
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {scanState === 'not-found' && (
                <div style={styles.overlay}>
                  <div style={styles.overlayCard}>
                    <p className="error-text" style={{ margin: 0 }}>Code inconnu pour cette invitation.</p>
                    <button type="button" onClick={resumeScanning} className="btn btn-outline" style={{ marginTop: '1rem' }}>
                      Réessayer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="editor-section">
          <h2>Recherche manuelle</h2>
          <input
            type="text"
            placeholder="Rechercher un invité par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ maxWidth: '320px', marginBottom: '1rem' }}
          />
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Statut RSVP</th>
                <th>Arrivée</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g) => (
                <tr key={g.id}>
                  <td>{g.rsvp?.name || g.name || '—'}</td>
                  <td>{g.rsvp ? (g.rsvp.answer === 'YES' ? 'Présent' : 'Absent') : 'En attente'}</td>
                  <td>{g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString('fr-FR') : '—'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleManualCheckIn(g.id, Boolean(g.checkedInAt))}
                      className={g.checkedInAt ? 'btn btn-danger-outline btn-sm' : 'btn btn-outline btn-sm'}
                    >
                      {g.checkedInAt ? 'Annuler' : 'Marquer arrivé'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--color-bg, #faf7f2)', padding: '2rem 1rem' },
  container: { maxWidth: '900px', margin: '0 auto' },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    color: '#6b7280',
    textAlign: 'center',
    padding: '2rem',
  },
  scannerWrap: {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
    aspectRatio: '3 / 4',
    background: '#000',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  scanHint: {
    position: 'absolute',
    bottom: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    padding: '0.4rem 0.9rem',
    borderRadius: 'var(--radius-pill)',
    fontSize: '0.8rem',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  overlayCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    width: '100%',
    maxWidth: '320px',
  },
};
