import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';

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

  if (loading) return <p className="admin-muted">Chargement...</p>;

  return (
    <div style={{ maxWidth: '520px' }}>
      <span className="admin-eyebrow">Client</span>
      <h1>{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>
      <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
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
        <label className="field">
          Téléphone
          <input value={form.phone} onChange={handleChange('phone')} className="input" />
        </label>
        <label className="field">
          WhatsApp
          <input value={form.whatsapp} onChange={handleChange('whatsapp')} className="input" />
        </label>
        <label className="field">
          Email
          <input type="email" value={form.email} onChange={handleChange('email')} className="input" />
        </label>
        <label className="field">
          Adresse
          <input value={form.address} onChange={handleChange('address')} className="input" />
        </label>
        <label className="field">
          Notes
          <textarea value={form.notes} onChange={handleChange('notes')} rows={3} className="input" />
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <Link to={isEdit ? `/admin/clients/${id}` : '/admin/clients'} className="btn btn-ghost">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
