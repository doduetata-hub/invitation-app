import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_OPTIONS, PAYMENT_LABELS, PAYMENT_OPTIONS } from '../../shared/constants/invitations';
import ProgramEditor from '../components/ProgramEditor';
import ThemeEditor from '../components/ThemeEditor';
import SectionsToggle from '../components/SectionsToggle';
import MediaUploader from '../components/MediaUploader';
import MusicUploader from '../components/MusicUploader';
import PaymentsSection from '../components/PaymentsSection';
import InvitationPage from '../../public/InvitationPage';
import { getTemplate } from '../../public/templates/registry';

const emptyForm = {
  clientId: '',
  templateId: '',
  eventType: '',
  title: '',
  namesLine: '',
  eventDate: '',
  eventTime: '',
  venueName: '',
  address: '',
  latitude: '',
  longitude: '',
  invitationText: '',
  personalMessage: '',
  dressCode: '',
  price: '',
  paymentStatus: 'PENDING',
};

export default function InvitationEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId') || '';

  const [form, setForm] = useState({ ...emptyForm, clientId: preselectedClientId });
  const [themeDraft, setThemeDraft] = useState({});
  const [invitation, setInvitation] = useState(null);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState('mobile');
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [checkinTokenBusy, setCheckinTokenBusy] = useState(false);
  const [checkinTokenCopied, setCheckinTokenCopied] = useState(false);

  useEffect(() => {
    api.get('/clients').then(setClients).catch((err) => setError(err.message));
    api.get('/templates').then(setTemplates).catch((err) => setError(err.message));
  }, []);

  const loadInvitation = () => {
    return api
      .get(`/invitations/${id}`)
      .then((data) => {
        setInvitation(data);
        setThemeDraft(data.theme || {});
        setForm({
          clientId: data.clientId,
          templateId: data.templateId,
          eventType: data.eventType,
          title: data.title,
          namesLine: data.namesLine || '',
          eventDate: data.eventDate ? data.eventDate.slice(0, 10) : '',
          eventTime: data.eventTime || '',
          venueName: data.venueName || '',
          address: data.address || '',
          latitude: data.latitude ?? '',
          longitude: data.longitude ?? '',
          invitationText: data.invitationText || '',
          personalMessage: data.personalMessage || '',
          dressCode: data.dressCode || '',
          price: data.price ?? '',
          paymentStatus: data.paymentStatus,
        });
      })
      .catch((err) => setError(err.message));
  };

  const refreshMedia = () => {
    api.get(`/invitations/${id}`).then((data) => setInvitation((inv) => ({ ...inv, media: data.media, musicUrl: data.musicUrl })));
  };

  useEffect(() => {
    if (!isEdit) return;
    loadInvitation().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  // Avertit avant de fermer/rafraîchir l'onglet s'il y a des changements non enregistrés,
  // pour ne jamais perdre silencieusement une saisie en cours.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setDirty(true);
    setSaved(false);
  };

  const handleThemeChange = (nextTheme) => {
    setThemeDraft(nextTheme);
    setDirty(true);
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const updated = await api.patch(`/invitations/${id}`, { ...form, theme: themeDraft });
        setInvitation((inv) => ({ ...inv, ...updated }));
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const created = await api.post('/invitations', { ...form, theme: themeDraft });
        setDirty(false);
        navigate(`/admin/invitations/${created.id}/edit`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const clientAccessUrl = invitation?.clientAccessToken
    ? `${window.location.origin}/gerer/${invitation.clientAccessToken}`
    : '';

  const handleGenerateClientAccess = async () => {
    setTokenBusy(true);
    setError('');
    try {
      const { clientAccessToken } = await api.post(`/invitations/${id}/client-access-token`);
      setInvitation((inv) => ({ ...inv, clientAccessToken }));
    } catch (err) {
      setError(err.message);
    } finally {
      setTokenBusy(false);
    }
  };

  const handleRevokeClientAccess = async () => {
    if (!window.confirm("Révoquer ce lien ? Il cessera immédiatement de fonctionner.")) return;
    setTokenBusy(true);
    setError('');
    try {
      await api.delete(`/invitations/${id}/client-access-token`);
      setInvitation((inv) => ({ ...inv, clientAccessToken: null }));
    } catch (err) {
      setError(err.message);
    } finally {
      setTokenBusy(false);
    }
  };

  const handleCopyClientAccess = () => {
    navigator.clipboard?.writeText(clientAccessUrl);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 1500);
  };

  const checkinAccessUrl = invitation?.checkinAccessToken
    ? `${window.location.origin}/checkin/${invitation.checkinAccessToken}`
    : '';

  const handleGenerateCheckinAccess = async () => {
    setCheckinTokenBusy(true);
    setError('');
    try {
      const { checkinAccessToken } = await api.post(`/invitations/${id}/checkin-access-token`);
      setInvitation((inv) => ({ ...inv, checkinAccessToken }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckinTokenBusy(false);
    }
  };

  const handleRevokeCheckinAccess = async () => {
    if (!window.confirm("Révoquer ce lien ? Il cessera immédiatement de fonctionner.")) return;
    setCheckinTokenBusy(true);
    setError('');
    try {
      await api.delete(`/invitations/${id}/checkin-access-token`);
      setInvitation((inv) => ({ ...inv, checkinAccessToken: null }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckinTokenBusy(false);
    }
  };

  const handleCopyCheckinAccess = () => {
    navigator.clipboard?.writeText(checkinAccessUrl);
    setCheckinTokenCopied(true);
    setTimeout(() => setCheckinTokenCopied(false), 1500);
  };

  const handleStatusChange = async (e) => {
    const status = e.target.value;
    setStatusSaving(true);
    setError('');
    try {
      const updated = await api.patch(`/invitations/${id}/status`, { status });
      setInvitation((inv) => ({ ...inv, ...updated }));
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusSaving(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === form.templateId);
  const templateTokens = useMemo(
    () => getTemplate(selectedTemplate?.key).tokens,
    [selectedTemplate?.key]
  );

  const previewInvitation = useMemo(() => {
    if (!selectedTemplate) return null;
    return {
      ...form,
      template: { key: selectedTemplate.key },
      theme: themeDraft,
      events: invitation?.events || [],
      media: invitation?.media || [],
      musicUrl: invitation?.musicUrl,
      contactPhone: invitation?.client?.phone,
      contactWhatsapp: invitation?.client?.whatsapp,
    };
  }, [form, themeDraft, selectedTemplate, invitation]);

  if (loading) return <p className="admin-muted">Chargement...</p>;

  return (
    <div className="editor-columns">
      <div className="editor-main">
        <div className="page-header">
          <div>
            <span className="admin-eyebrow">{isEdit ? 'Modifier' : 'Créer'}</span>
            <h1>{isEdit ? form.title || 'Invitation' : 'Nouvelle invitation'}</h1>
          </div>
          {isEdit && invitation && (
            <select value={invitation.status} onChange={handleStatusChange} disabled={statusSaving} className="input" style={{ width: 'auto' }}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
        </div>

        {isEdit && invitation?.status === 'PUBLISHED' && (
          <div className="public-link-box">
            <p style={{ margin: 0 }}>
              URL publique : <a href={`/i/${invitation.slug}`} target="_blank" rel="noreferrer">/i/{invitation.slug}</a>
            </p>
            <div className="qr-row">
              <img src={`/api/invitations/${id}/qrcode`} alt="QR Code" className="qr-image" />
              <a
                href={`/api/invitations/${id}/qrcode`}
                download={`qrcode-${invitation.slug}.png`}
                className="btn btn-outline btn-sm"
              >
                Télécharger le QR Code
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1.25rem' }}>
          <div className="field-row">
            <label className="field">
              Client *
              <select value={form.clientId} onChange={handleChange('clientId')} required className="input">
                <option value="">Sélectionner...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Template *
              <select value={form.templateId} onChange={handleChange('templateId')} required className="input">
                <option value="">Sélectionner...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              Type d'événement *
              <input value={form.eventType} onChange={handleChange('eventType')} required placeholder="mariage, anniversaire..." className="input" />
            </label>
            <label className="field">
              Titre *
              <input value={form.title} onChange={handleChange('title')} required className="input" />
            </label>
          </div>

          <label className="field">
            Nom(s)
            <input value={form.namesLine} onChange={handleChange('namesLine')} placeholder="Marie & Paul" className="input" />
          </label>

          <div className="field-row">
            <label className="field">
              Date
              <input type="date" value={form.eventDate} onChange={handleChange('eventDate')} className="input" />
            </label>
            <label className="field">
              Heure
              <input value={form.eventTime} onChange={handleChange('eventTime')} placeholder="16:00" className="input" />
            </label>
          </div>

          <label className="field">
            Lieu
            <input value={form.venueName} onChange={handleChange('venueName')} className="input" />
          </label>
          <label className="field">
            Adresse
            <input value={form.address} onChange={handleChange('address')} className="input" />
          </label>
          <div className="field-row">
            <label className="field">
              Latitude <span className="admin-muted" style={{ fontWeight: 400 }}>(optionnel, pour la carte)</span>
              <input type="number" step="any" value={form.latitude} onChange={handleChange('latitude')} placeholder="48.8566" className="input" />
            </label>
            <label className="field">
              Longitude <span className="admin-muted" style={{ fontWeight: 400 }}>(optionnel)</span>
              <input type="number" step="any" value={form.longitude} onChange={handleChange('longitude')} placeholder="2.3522" className="input" />
            </label>
          </div>
          <label className="field">
            Texte d'invitation
            <textarea value={form.invitationText} onChange={handleChange('invitationText')} rows={3} className="input" />
          </label>
          <label className="field">
            Message personnalisé
            <textarea value={form.personalMessage} onChange={handleChange('personalMessage')} rows={2} className="input" />
          </label>
          <label className="field">
            Thème <span className="admin-muted" style={{ fontWeight: 400 }}>(optionnel, ex. tenue attendue)</span>
            <input value={form.dressCode} onChange={handleChange('dressCode')} placeholder="Smoking et doré" className="input" />
          </label>

          <div className="field-row">
            <label className="field">
              Prix (€)
              <input type="number" step="0.01" value={form.price} onChange={handleChange('price')} className="input" />
            </label>
            <label className="field">
              Statut de paiement
              <select value={form.paymentStatus} onChange={handleChange('paymentStatus')} className="input">
                {PAYMENT_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PAYMENT_LABELS[p]}</option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="form-actions">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer l’invitation'}
            </button>
            <Link to="/admin/invitations" className="btn btn-ghost">Annuler</Link>
            {saved && <span className="success-text">✓ Enregistré</span>}
            {dirty && !saving && <span className="admin-muted" style={{ fontSize: '0.85rem' }}>Modifications non enregistrées</span>}
          </div>
        </form>

        {selectedTemplate && (
          <div className="editor-section">
            <h2>Design</h2>
            <ThemeEditor templateTokens={templateTokens} theme={themeDraft} onChange={handleThemeChange} />
            <h3 style={{ marginTop: '1.25rem' }}>Sections affichées</h3>
            <SectionsToggle theme={themeDraft} onChange={handleThemeChange} />
            <p className="design-hint">
              Les changements de design ci-dessus sont appliqués dans l'aperçu immédiatement ; cliquez sur « Enregistrer » pour les sauvegarder.
            </p>
          </div>
        )}

        {isEdit && invitation && (
          <div className="editor-section">
            <h2>Photos & vidéos</h2>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>Photo de couverture</h3>
            <MediaUploader invitationId={id} type="cover" media={invitation.media} onChange={refreshMedia} />
            <h3 style={{ fontSize: '0.9rem', marginTop: '1.25rem', marginBottom: '0.4rem' }}>Galerie (photos et vidéos)</h3>
            <MediaUploader invitationId={id} type="gallery" media={invitation.media} onChange={refreshMedia} />
          </div>
        )}

        {isEdit && invitation && (
          <div className="editor-section">
            <h2>Musique de fond</h2>
            <MusicUploader invitationId={id} musicUrl={invitation.musicUrl} onChange={refreshMedia} />
          </div>
        )}

        {isEdit && (
          <div className="editor-section">
            <h2>Programme</h2>
            <ProgramEditor invitationId={id} />
          </div>
        )}

        {isEdit && (
          <div className="editor-section">
            <h2>Invités</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to={`/admin/invitations/${id}/guests`} className="btn btn-primary">
                Gérer les invités et les RSVP →
              </Link>
              <Link to={`/admin/invitations/${id}/checkin`} className="btn btn-accent">
                Check-in Jour J →
              </Link>
            </div>
          </div>
        )}

        {isEdit && invitation && (
          <div className="editor-section">
            <h2>Accès client</h2>
            <p className="admin-muted" style={{ marginTop: 0 }}>
              Donne au client un lien direct, sans mot de passe, pour créer et gérer lui-même les liens
              personnalisés de <strong>cette</strong> invitation uniquement — il n'a accès à rien d'autre
              (autres invitations, édition, templates...).
            </p>
            {invitation.clientAccessToken ? (
              <>
                <div className="public-link-box">
                  <p style={{ margin: 0, wordBreak: 'break-all' }}>{clientAccessUrl}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button type="button" onClick={handleCopyClientAccess} className="btn btn-outline btn-sm">
                    {tokenCopied ? 'Copié !' : 'Copier le lien'}
                  </button>
                  <button type="button" onClick={handleGenerateClientAccess} disabled={tokenBusy} className="btn btn-outline btn-sm">
                    Régénérer
                  </button>
                  <button type="button" onClick={handleRevokeClientAccess} disabled={tokenBusy} className="btn btn-danger-outline btn-sm">
                    Révoquer
                  </button>
                </div>
              </>
            ) : (
              <button type="button" onClick={handleGenerateClientAccess} disabled={tokenBusy} className="btn btn-primary">
                {tokenBusy ? '...' : 'Générer le lien'}
              </button>
            )}
          </div>
        )}

        {isEdit && invitation && (
          <div className="editor-section">
            <h2>Accès check-in (jour J)</h2>
            <p className="admin-muted" style={{ marginTop: 0 }}>
              Lien <strong>distinct</strong> du précédent, à donner à la personne qui filtre l'entrée le
              jour J (souvent pas le client lui-même). Permet de scanner/rechercher et pointer les
              arrivées — mais jamais de créer, modifier ou supprimer un invité.
            </p>
            {invitation.checkinAccessToken ? (
              <>
                <div className="public-link-box">
                  <p style={{ margin: 0, wordBreak: 'break-all' }}>{checkinAccessUrl}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button type="button" onClick={handleCopyCheckinAccess} className="btn btn-outline btn-sm">
                    {checkinTokenCopied ? 'Copié !' : 'Copier le lien'}
                  </button>
                  <button type="button" onClick={handleGenerateCheckinAccess} disabled={checkinTokenBusy} className="btn btn-outline btn-sm">
                    Régénérer
                  </button>
                  <button type="button" onClick={handleRevokeCheckinAccess} disabled={checkinTokenBusy} className="btn btn-danger-outline btn-sm">
                    Révoquer
                  </button>
                </div>
              </>
            ) : (
              <button type="button" onClick={handleGenerateCheckinAccess} disabled={checkinTokenBusy} className="btn btn-primary">
                {checkinTokenBusy ? '...' : 'Générer le lien'}
              </button>
            )}
          </div>
        )}

        {isEdit && (
          <div className="editor-section">
            <h2>Paiements</h2>
            <PaymentsSection invitationId={id} price={form.price} />
          </div>
        )}
      </div>

      {previewInvitation && (
        <div className="preview-column">
          <p className="preview-label">Aperçu</p>
          <div className="preview-modes">
            {[
              { id: 'mobile', label: 'Mobile' },
              { id: 'tablet', label: 'Tablette' },
              { id: 'desktop', label: 'Desktop' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMode(m.id)}
                className={`preview-mode-btn${previewMode === m.id ? ' is-active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className={`preview-frame preview-frame--${previewMode}`}>
            <InvitationPage invitation={previewInvitation} />
          </div>
        </div>
      )}
    </div>
  );
}
