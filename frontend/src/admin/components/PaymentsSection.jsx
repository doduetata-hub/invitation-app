import { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';

const emptyForm = { amount: '', method: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' };

export default function PaymentsSection({ invitationId, price }) {
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/invitations/${invitationId}/payments`).then(setPayments).catch((err) => setError(err.message));
  };

  useEffect(load, [invitationId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/invitations/${invitationId}/payments`, form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce paiement ?')) return;
    try {
      await api.delete(`/payments/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const priceNumber = price === '' || price == null ? null : Number(price);

  return (
    <div>
      <p style={{ fontSize: '0.92rem' }}>
        Total payé : <strong>{totalPaid.toFixed(2)} €</strong>
        {priceNumber != null && (
          <> {' '}/ Prix : <strong>{priceNumber.toFixed(2)} €</strong>
            {totalPaid < priceNumber && <> — reste <strong style={{ color: 'var(--color-accent-dark)' }}>{(priceNumber - totalPaid).toFixed(2)} €</strong></>}
          </>
        )}
      </p>

      {error && <p className="error-text">{error}</p>}

      {payments.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: '0.9rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Montant</th>
              <th>Mode</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.paidAt).toLocaleDateString('fr-FR')}</td>
                <td>{Number(p.amount).toFixed(2)} €</td>
                <td>{p.method || '—'}</td>
                <td>{p.notes || '—'}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(p.id)} className="btn btn-danger-outline btn-icon">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Montant (€)"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
          className="input"
          style={{ width: '120px', flex: 'none' }}
        />
        <input
          placeholder="Mode (virement, espèces...)"
          value={form.method}
          onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
          className="input"
        />
        <input
          type="date"
          value={form.paidAt}
          onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
          className="input"
        />
        <input
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="input"
        />
        <button type="submit" disabled={saving} className="btn btn-outline" style={{ flexShrink: 0 }}>+ Ajouter</button>
      </form>
    </div>
  );
}
