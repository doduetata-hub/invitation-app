import { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import Icon from './ui/Icon';

const emptyEvent = { title: '', time: '', location: '', description: '' };
const FIELDS = [
  { key: 'title', label: 'Titre' },
  { key: 'time', label: 'Heure' },
  { key: 'location', label: 'Lieu' },
  { key: 'description', label: 'Description' },
];

// onChange(events) : prévient l'éditeur à chaque chargement/modification du programme, pour que l'aperçu en direct l'affiche aussitôt.
export default function ProgramEditor({ invitationId, onChange }) {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyEvent);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    if (!savedAt) return undefined;
    const timer = setTimeout(() => setSavedAt(0), 3000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const load = () => {
    api
      .get(`/invitations/${invitationId}/events`)
      .then((list) => {
        setEvents(list);
        if (onChange) onChange(list);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, [invitationId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/invitations/${invitationId}/events`, { ...form, order: events.length });
      setForm(emptyEvent);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldUpdate = async (id, field, value) => {
    try {
      await api.patch(`/events/${id}`, { [field]: value });
      setError('');
      setSavedAt(Date.now());
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet événement du programme ?')) return;
    try {
      await api.delete(`/events/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      {events.length === 0 ? (
        <div className="empty-state">Aucun événement dans le programme.</div>
      ) : (
        <ul className="program-list">
          {events.map((ev) => (
            <li key={ev.id} className="program-row">
              {FIELDS.map((f) => (
                <label key={f.key} className={`program-field program-field--${f.key}`}>
                  <span>{f.label}</span>
                  <input
                    defaultValue={ev[f.key] || ''}
                    placeholder={f.label}
                    onBlur={(e) => e.target.value !== (ev[f.key] || '') && handleFieldUpdate(ev.id, f.key, e.target.value)}
                    className="input"
                    style={f.key === 'title' ? { fontWeight: 700 } : undefined}
                  />
                </label>
              ))}
              <button type="button" onClick={() => handleDelete(ev.id)} className="btn btn-danger-outline btn-icon" aria-label={`Supprimer : ${ev.title}`} title="Supprimer">
                <Icon name="trash" />
                <span className="program-delete-label">Supprimer l'étape</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="saved-note success-text" role="status">{savedAt ? '✓ Modification enregistrée' : ''}</p>

      <form onSubmit={handleAdd} className="program-row program-row--new">
        {FIELDS.map((f) => (
          <label key={f.key} className={`program-field program-field--${f.key}`}>
            <span>{f.key === 'title' ? 'Nouvelle étape : titre' : f.label}</span>
            <input
              placeholder={f.key === 'title' ? 'Titre (ex: Cérémonie)' : f.label}
              value={form[f.key]}
              onChange={(e) => setForm((current) => ({ ...current, [f.key]: e.target.value }))}
              className="input"
            />
          </label>
        ))}
        <button type="submit" disabled={saving} className="btn btn-outline">+ Ajouter</button>
      </form>
    </div>
  );
}
