import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { api } from '../../shared/api/client';

function extractGuestCode(scannedText) {
  try {
    const url = new URL(scannedText);
    return url.searchParams.get('guest');
  } catch {
    return null;
  }
}

export default function CheckInPage() {
  const { id } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [cameraError, setCameraError] = useState('');
  const [scanState, setScanState] = useState('scanning'); // scanning | found | not-found
  const [found, setFound] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const scanStateRef = useRef('scanning');

  const load = useCallback(() => {
    api.get(`/invitations/${id}/guests`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    api.get(`/invitations/${id}`).then(setInvitation).catch((err) => setError(err.message));
    load();
  }, [id, load]);

  const handleScan = useCallback(
    async (text) => {
      const code = extractGuestCode(text);
      if (!code) return;

      scanStateRef.current = 'found';
      setScanState('found');
      try {
        const guest = await api.get(`/invitations/${id}/checkin/lookup?code=${encodeURIComponent(code)}`);
        setFound(guest);
      } catch {
        setFound(null);
        setScanState('not-found');
        scanStateRef.current = 'not-found';
      }
    },
    [id]
  );

  useEffect(() => {
    let stopped = false;
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
      await api.post(`/guests/${found.id}/checkin`);
      load();
      setTimeout(resumeScanning, 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const toggleManualCheckIn = async (kind, entryId, isCheckedIn) => {
    try {
      const path = kind === 'guest' ? `/guests/${entryId}/checkin` : `/rsvps/${entryId}/checkin`;
      if (isCheckedIn) {
        await api.delete(path);
      } else {
        await api.post(path);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!data || !invitation) {
    return (
      <div className="admin-root" style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '1.5rem' }}>
        <p className="admin-muted">Chargement...</p>
      </div>
    );
  }

  const { guests, walkInRsvps, stats } = data;
  const q = search.trim().toLowerCase();
  const filteredGuests = guests.filter((g) => (g.rsvp?.name || g.name || '').toLowerCase().includes(q));
  const filteredWalkIns = walkInRsvps.filter((r) => r.name.toLowerCase().includes(q));

  return (
    <div className="admin-root" style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: '1.5rem' }}>
      <div className="page-header">
        <div>
          <Link to={`/admin/invitations/${id}/guests`} className="admin-eyebrow" style={{ textDecoration: 'none' }}>← {invitation.title}</Link>
          <h1 style={{ margin: '0.3rem 0 0' }}>Check-in — Jour J</h1>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="stats-grid" style={{ marginTop: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.arrived}</div>
          <div className="stat-label">Arrivés</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.confirmed}</div>
          <div className="stat-label">Confirmés</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalGuests}</div>
          <div className="stat-label">Total invités</div>
        </div>
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
                    onClick={() => toggleManualCheckIn('guest', g.id, Boolean(g.checkedInAt))}
                    className={g.checkedInAt ? 'btn btn-danger-outline btn-sm' : 'btn btn-outline btn-sm'}
                  >
                    {g.checkedInAt ? 'Annuler' : 'Marquer arrivé'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredWalkIns.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.answer === 'YES' ? 'Présent' : 'Absent'}</td>
                <td>{r.checkedInAt ? new Date(r.checkedInAt).toLocaleTimeString('fr-FR') : '—'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleManualCheckIn('rsvp', r.id, Boolean(r.checkedInAt))}
                    className={r.checkedInAt ? 'btn btn-danger-outline btn-sm' : 'btn btn-outline btn-sm'}
                  >
                    {r.checkedInAt ? 'Annuler' : 'Marquer arrivé'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
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
