import { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';

const emptyEvent = { title: '', time: '', location: '', description: '' };

export default function ProgramEditor({ invitationId }) {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyEvent);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/invitations/${invitationId}/events`).then(setEvents).catch((err) => setError(err.message));
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
        <p className="admin-muted">Aucun événement dans le programme.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {events.map((ev) => (
            <li key={ev.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                defaultValue={ev.title}
                onBlur={(e) => e.target.value !== ev.title && handleFieldUpdate(ev.id, 'title', e.target.value)}
                className="input"
                style={{ fontWeight: 600 }}
              />
              <input
                defaultValue={ev.time || ''}
                placeholder="Heure"
                onBlur={(e) => e.target.value !== (ev.time || '') && handleFieldUpdate(ev.id, 'time', e.target.value)}
                className="input"
                style={{ width: '80px', flex: 'none' }}
              />
              <input
                defaultValue={ev.location || ''}
                placeholder="Lieu"
                onBlur={(e) => e.target.value !== (ev.location || '') && handleFieldUpdate(ev.id, 'location', e.target.value)}
                className="input"
              />
              <input
                defaultValue={ev.description || ''}
                placeholder="Description"
                onBlur={(e) => e.target.value !== (ev.description || '') && handleFieldUpdate(ev.id, 'description', e.target.value)}
                className="input"
              />
              <button type="button" onClick={() => handleDelete(ev.id)} className="btn btn-danger-outline btn-icon">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', alignItems: 'center' }}>
        <input
          placeholder="Titre (ex: Cérémonie)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="input"
        />
        <input
          placeholder="Heure"
          value={form.time}
          onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
          className="input"
          style={{ width: '80px', flex: 'none' }}
        />
        <input
          placeholder="Lieu"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          className="input"
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="input"
        />
        <button type="submit" disabled={saving} className="btn btn-outline" style={{ flexShrink: 0 }}>+ Ajouter</button>
      </form>
    </div>
  );
}
