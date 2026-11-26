import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import PageHeader from '../components/ui/PageHeader';
import Loading from '../components/ui/Loading';

const emptyForm = {
  firstName: '',
  lastName: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  notes: '',
};

export default function ClientFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/clients/${id}`)
      .then((data) => setForm({ ...emptyForm, ...data }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.patch(`/clients/${id}`, form);
        navigate(`/admin/clients/${id}`);
      } else {
        const created = await api.post('/clients', form);
        navigate(`/admin/clients/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const backTo = isEdit ? `/admin/clients/${id}` : '/admin/clients';

  return (
    <div className="page--narrow">
      <PageHeader
        title={isEdit ? 'Modifier le client' : 'Nouveau client'}
        subtitle="Les champs marqués d'un astérisque sont obligatoires."
        back={{ to: backTo, label: isEdit ? 'Fiche client' : 'Clients' }}
      />
      <form onSubmit={handleSubmit} className="panel form-stack">
        <div className="form-section">
          <h2>Identité</h2>
          <div className="field-row">
            <label className="field">
              Prénom *
              <input value={form.firstName} onChange={handleChange('firstName')} required className="input" />
            </label>
            <label className="field">
              Nom *
              <input value={form.lastName} onChange={handleChange('lastName')} required className="input" />
            </label>
          </div>
        </div>
        <div className="form-section">
          <h2>Coordonnées</h2>
          <div className="field-row">
            <label className="field">
              Téléphone
              <input type="tel" autoComplete="off" value={form.phone || ''} onChange={handleChange('phone')} className="input" />
            </label>
            <label className="field">
              WhatsApp
              <input type="tel" autoComplete="off" value={form.whatsapp || ''} onChange={handleChange('whatsapp')} className="input" />
            </label>
          </div>
          <label className="field">
            Email
            <input type="email" value={form.email || ''} onChange={handleChange('email')} className="input" />
          </label>
          <label className="field">
            Adresse
            <input value={form.address || ''} onChange={handleChange('address')} className="input" />
          </label>
        </div>
        <div className="form-section">
          <label className="field">
            Notes
            <textarea value={form.notes || ''} onChange={handleChange('notes')} rows={3} className="input" />
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="form-actions action-bar">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link to={backTo} className="btn btn-ghost">
              Annuler
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
