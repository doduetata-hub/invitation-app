import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams, Link, NavLink } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_OPTIONS, PAYMENT_LABELS, PAYMENT_OPTIONS } from '../../shared/constants/invitations';
import ProgramEditor from '../components/ProgramEditor';
import ThemeEditor from '../components/ThemeEditor';
import TextsEditor from '../components/TextsEditor';
import SectionsToggle from '../components/SectionsToggle';
import MediaUploader from '../components/MediaUploader';
import MusicUploader from '../components/MusicUploader';
import PaymentsSection from '../components/PaymentsSection';
import InvitationPage from '../../public/InvitationPage';
import { getTemplate } from '../../public/templates/registry';
import PageHeader from '../components/ui/PageHeader';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';
import PreviewModes from '../components/PreviewModes';
import PreviewScreen from '../components/PreviewScreen';
import ShareButton from '../../shared/components/ShareButton';
import { useCompact, usePreviewApart } from '../hooks/useMediaQuery';
import { useUnsavedGuard } from '../hooks/useUnsavedGuard';

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

const PANELS = [
  { id: 'infos', label: 'Infos' },
  { id: 'design', label: 'Design' },
  { id: 'medias', label: 'Médias' },
  { id: 'programme', label: 'Programme' },
  { id: 'acces', label: 'Accès et paiement' },
];

// Pages de l'invitation (hors de l'éditeur) : accessibles depuis la même rangée.
const PAGES = [
  { to: 'guests', label: 'Invités', icon: 'users' },
  { to: 'checkin', label: 'Check-in', icon: 'userCheck' },
  { to: 'guestbook', label: 'Livre d’or', icon: 'guestbook' },
];

export default function InvitationEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('clientId') || '';
  const preselectedTemplateId = searchParams.get('templateId') || ''; // bouton « Utiliser » de la bibliothèque
  const location = useLocation();
  const compact = useCompact();
  const previewApart = usePreviewApart();
  const [previewOpen, setPreviewOpen] = useState(false);
  const stepsRef = useRef(null);

  const [form, setForm] = useState({ ...emptyForm, clientId: preselectedClientId, templateId: preselectedTemplateId });
  const [themeDraft, setThemeDraft] = useState({});
  // L'éditeur n'affiche plus douze blocs à la suite : un panneau à la fois, l'aperçu reste toujours visible à droite.
  const [panel, setPanel] = useState('infos');
  const [designPart, setDesignPart] = useState('look');
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

  useUnsavedGuard(dirty);

  // « Créer et continuer » : la page d'édition s'ouvre directement sur l'étape suivante.
  useEffect(() => {
    if (location.state?.panel) setPanel(location.state.panel);
  }, [location.state]);

  // L'étape active reste visible dans la rangée qui défile (téléphone).
  useEffect(() => {
    const row = stepsRef.current;
    const active = row?.querySelector('.is-active');
    if (row && active) row.scrollLeft = active.offsetLeft - row.offsetLeft - 48;
  }, [panel, compact, loading]);

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

  const save = async () => {
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
        navigate(`/admin/invitations/${created.id}/edit`, compact ? { state: { panel: 'design' } } : undefined);
        if (compact) window.scrollTo(0, 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    save();
  };

  // Enregistrement depuis un autre panneau que « Infos » : le formulaire (et sa validation) n'est pas affiché.
  const handleSaveElsewhere = () => {
    if (!form.clientId || !form.templateId || !form.eventType?.trim() || !form.title?.trim()) {
      setPanel('infos');
      setError("Renseignez le client, le template, le type d'événement et le titre avant d'enregistrer.");
      return;
    }
    save();
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

  // Publier ou retirer une invitation se voit immédiatement des invités : on demande confirmation.
  const changeStatus = async (status) => {
    const published = invitation.status === 'PUBLISHED';
    if (status === invitation.status) return;
    const name = form.title || 'cette invitation';
    if (status === 'PUBLISHED') {
      const unsaved = dirty ? '\n\nAttention : vos modifications non enregistrées ne seront pas visibles.' : '';
      if (!window.confirm(`Publier « ${name} » ?\nSa page devient accessible à toute personne qui a le lien.${unsaved}`)) return;
    } else if (published) {
      if (!window.confirm(`Dépublier « ${name} » ?\nSa page et les liens des invités cesseront de fonctionner.\nNouveau statut : ${STATUS_LABELS[status]}.`)) return;
    }
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
  // Textes fixes du template que l'organisateur peut personnaliser (undefined si le template n'en propose pas).
  const templateTexts = useMemo(() => getTemplate(selectedTemplate?.key).texts, [selectedTemplate?.key]);

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

  const show = (name) => !isEdit || panel === name;
  const panelIndex = PANELS.findIndex((p) => p.id === panel);
  const goToPanel = (panelId) => {
    setPanel(panelId);
    if (compact) window.scrollTo(0, 0);
  };

  if (loading) return <Loading />;

  const onInfos = !isEdit || panel === 'infos';
  const publicPath = invitation ? `/i/${invitation.slug}` : '';
  let saveLabel = 'Enregistrer';
  if (!isEdit) saveLabel = compact ? 'Créer et continuer' : 'Créer l’invitation';
  if (saving) saveLabel = 'Enregistrement...';

  return (
    <div className="editor-columns">
      <div className="editor-main">
        <PageHeader
          title={isEdit ? form.title || 'Invitation' : 'Nouvelle invitation'}
          back={{ to: '/admin/invitations', label: 'Invitations' }}
        >
          {isEdit && invitation && (
            <div className="publish-row">
              <label className="status-control">
                Statut
                <select value={invitation.status} onChange={(e) => changeStatus(e.target.value)} disabled={statusSaving} className="input">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              {invitation.status === 'PUBLISHED' ? (
                <button type="button" className="btn btn-outline" onClick={() => changeStatus('READY')} disabled={statusSaving}>
                  Dépublier
                </button>
              ) : (
                <button type="button" className="btn btn-accent" onClick={() => changeStatus('PUBLISHED')} disabled={statusSaving}>
                  Publier
                </button>
              )}
            </div>
          )}
        </PageHeader>

        {isEdit && compact && (
          <nav className="editor-shortcuts" aria-label="Pages de l'invitation">
            {PAGES.map((pg) => (
              <Link key={pg.to} to={`/admin/invitations/${id}/${pg.to}`} className="btn btn-outline">
                <Icon name={pg.icon} />
                {pg.label}
              </Link>
            ))}
          </nav>
        )}

        {isEdit && (
          <nav className="editor-nav" aria-label="Parties de l'invitation" ref={stepsRef}>
            <div className="editor-nav__group">
              {PANELS.map((pn, index) => (
                <button key={pn.id} type="button" className={`editor-nav__btn${panel === pn.id ? ' is-active' : ''}`} onClick={() => goToPanel(pn.id)} aria-current={panel === pn.id ? 'step' : undefined}>
                  <span className="step-num" aria-hidden="true">{index + 1}</span>
                  {pn.label}
                </button>
              ))}
            </div>
            {!compact && (
              <div className="editor-nav__group editor-nav__group--pages">
                {PAGES.map((pg) => (
                  <NavLink key={pg.to} to={`/admin/invitations/${id}/${pg.to}`} className="editor-nav__btn editor-nav__btn--page">
                    {pg.label}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        )}

        {show('infos') && isEdit && invitation?.status === 'PUBLISHED' && (
          <div className="public-link-box">
            <img src={`/api/invitations/${id}/qrcode`} alt="QR Code" className="qr-image" />
            <div className="public-link-box__body">
              <span className="public-link-box__label">URL publique</span>
              <a href={publicPath} target="_blank" rel="noreferrer">{publicPath}</a>
              <div className="inline-actions">
                <a href={`/i/${invitation.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  <Icon name="external" />
                  Ouvrir la page
                </a>
                <a
                  href={`/api/invitations/${id}/qrcode`}
                  download={`qrcode-${invitation.slug}.png`}
                  className="btn btn-outline btn-sm"
                >
                  <Icon name="download" />
                  Télécharger le QR Code
                </a>
                <ShareButton
                  title={form.title}
                  url={`${window.location.origin}${publicPath}`}
                  qrUrl={`/api/invitations/${id}/qrcode`}
                  fileName={`qrcode-${invitation.slug}.png`}
                />
              </div>
            </div>
          </div>
        )}

        {show('infos') && (
        <form id="invitation-form" onSubmit={handleSubmit} className="panel editor-form form-stack">
          <div className="form-section">
            <h2>Client et modèle</h2>
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
          </div>

          <div className="form-section">
            <h2>Événement</h2>
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
          </div>

          <div className="form-section">
            <h2>Lieu</h2>
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
                <span>Latitude <span className="admin-muted">(optionnel, pour la carte)</span></span>
                <input type="number" inputMode="decimal" step="any" value={form.latitude} onChange={handleChange('latitude')} placeholder="48.8566" className="input" />
              </label>
              <label className="field">
                <span>Longitude <span className="admin-muted">(optionnel)</span></span>
                <input type="number" inputMode="decimal" step="any" value={form.longitude} onChange={handleChange('longitude')} placeholder="2.3522" className="input" />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>Textes</h2>
            <label className="field">
              Texte d'invitation
              <textarea value={form.invitationText} onChange={handleChange('invitationText')} rows={3} className="input" />
            </label>
            <label className="field">
              Message personnalisé
              <textarea value={form.personalMessage} onChange={handleChange('personalMessage')} rows={2} className="input" />
            </label>
            <label className="field">
              <span>Thème <span className="admin-muted">(optionnel, ex. tenue attendue)</span></span>
              <input value={form.dressCode} onChange={handleChange('dressCode')} placeholder="Smoking et doré" className="input" />
            </label>
          </div>

          <div className="form-section">
            <h2>Facturation</h2>
            <div className="field-row">
              <label className="field">
                Prix (€)
                <input type="number" inputMode="decimal" step="0.01" value={form.price} onChange={handleChange('price')} className="input" />
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
          </div>

          {error && <p className="error-text">{error}</p>}
        </form>
        )}

        {isEdit && panel !== 'infos' && error && <p className="error-text">{error}</p>}

        {show('design') && selectedTemplate && (
          <div className="editor-section">
            <h2>Design</h2>
            <div className="editor-sub" role="tablist" aria-label="Réglages du design">
              {[['look', 'Couleurs et polices'], ['sections', 'Sections'], ...(templateTexts ? [['texts', 'Textes']] : [])].map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={designPart === k} className={`editor-sub__btn${designPart === k ? ' is-active' : ''}`} onClick={() => setDesignPart(k)}>{label}</button>
              ))}
            </div>
            {designPart === 'look' && <ThemeEditor templateTokens={templateTokens} theme={themeDraft} onChange={handleThemeChange} />}
            {designPart === 'sections' && (
              <>
                <p className="section-lead">Cochez ce qui s'affiche et classez l'ordre avec les flèches.</p>
                <SectionsToggle theme={themeDraft} onChange={handleThemeChange} />
              </>
            )}
            {designPart === 'texts' && templateTexts && <TextsEditor groups={templateTexts} theme={themeDraft} onChange={handleThemeChange} />}
            <p className="design-hint">
              Les changements de design sont appliqués dans l'aperçu immédiatement ; touchez « Enregistrer » pour les sauvegarder.
            </p>
          </div>
        )}

        {show('medias') && isEdit && invitation && (
          <div className="editor-section">
            <h2>Photos & vidéos</h2>
            <div className="subsection-head"><h3>Photo de couverture</h3></div>
            <MediaUploader invitationId={id} type="cover" media={invitation.media} onChange={refreshMedia} />
            <div className="subsection-head"><h3>Galerie (photos et vidéos)</h3></div>
            <MediaUploader invitationId={id} type="gallery" media={invitation.media} onChange={refreshMedia} />
          </div>
        )}

        {show('medias') && isEdit && invitation && (
          <div className="editor-section">
            <h2>Musique de fond</h2>
            <MusicUploader invitationId={id} musicUrl={invitation.musicUrl} onChange={refreshMedia} />
          </div>
        )}

        {show('programme') && isEdit && (
          <div className="editor-section">
            <h2>Programme</h2>
            <ProgramEditor invitationId={id} onChange={(events) => setInvitation((inv) => ({ ...inv, events }))} />
          </div>
        )}

        {show('acces') && isEdit && invitation && (
          <div className="editor-section">
            <h2>Accès client</h2>
            <p className="section-lead">
              Donne au client un lien direct, sans mot de passe, pour créer et gérer lui-même les liens
              personnalisés de <strong>cette</strong> invitation uniquement — il n'a accès à rien d'autre
              (autres invitations, édition, templates...).
            </p>
            {invitation.clientAccessToken ? (
              <>
                <p className="share-link">{clientAccessUrl}</p>
                <div className="inline-actions">
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

        {show('acces') && isEdit && invitation && (
          <div className="editor-section">
            <h2>Accès check-in (jour J)</h2>
            <p className="section-lead">
              Lien <strong>distinct</strong> du précédent, à donner à la personne qui filtre l'entrée le
              jour J (souvent pas le client lui-même). Permet de scanner/rechercher et pointer les
              arrivées — mais jamais de créer, modifier ou supprimer un invité.
            </p>
            {invitation.checkinAccessToken ? (
              <>
                <p className="share-link">{checkinAccessUrl}</p>
                <div className="inline-actions">
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

        {show('acces') && isEdit && (
          <div className="editor-section">
            <h2>Paiements</h2>
            <PaymentsSection invitationId={id} price={form.price} />
          </div>
        )}

        <div className="form-actions action-bar editor-bar">
          {compact && isEdit && (
            <button type="button" className="btn btn-ghost action-bar__side" onClick={() => goToPanel(PANELS[panelIndex - 1].id)} disabled={panelIndex <= 0} aria-label="Étape précédente">
              <Icon name="chevronLeft" />
              <span>Préc.</span>
            </button>
          )}
          {previewApart && previewInvitation && (
            <button type="button" className={compact ? 'btn btn-ghost action-bar__side' : 'btn btn-outline'} onClick={() => setPreviewOpen(true)}>
              <Icon name="eye" />
              <span>Aperçu</span>
            </button>
          )}
          {onInfos ? (
            <button key="submit" type="submit" form="invitation-form" disabled={saving} className="btn btn-primary">
              {saveLabel}
            </button>
          ) : (
            <button key="save" type="button" onClick={handleSaveElsewhere} disabled={saving} className="btn btn-primary">
              {saveLabel}
            </button>
          )}
          {!compact && <Link to="/admin/invitations" className="btn btn-ghost">Annuler</Link>}
          {compact && isEdit && (
            <button type="button" className="btn btn-ghost action-bar__side" onClick={() => goToPanel(PANELS[panelIndex + 1].id)} disabled={panelIndex >= PANELS.length - 1} aria-label="Étape suivante">
              <Icon name="chevronRight" />
              <span>Suiv.</span>
            </button>
          )}
          <span className="save-bar__state" role="status">
            {saved && <span className="success-text">✓ Enregistré</span>}
            {dirty && !saving && <span className="dirty-note">Modifications non enregistrées</span>}
          </span>
        </div>
      </div>

      {previewInvitation && !previewApart && (
        <div className="preview-column">
          <div className="preview-bar">
            <p className="preview-label">Aperçu en direct</p>
            <PreviewModes value={previewMode} onChange={setPreviewMode} />
          </div>
          <div className="preview-scroll">
            <div className="preview-device">
              <div className={`preview-frame preview-frame--${previewMode}`}>
                <InvitationPage invitation={previewInvitation} />
              </div>
            </div>
          </div>
        </div>
      )}

      {previewInvitation && previewApart && previewOpen && (
        <PreviewScreen invitation={previewInvitation} mode={previewMode} onModeChange={setPreviewMode} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
