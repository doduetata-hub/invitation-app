import { useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import Icon from './ui/Icon';
import { useCompact } from '../hooks/useMediaQuery';

const emptyForm = { amount: '', method: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' };

export default function PaymentsSection({ invitationId, price }) {
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const compact = useCompact();

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
      <dl className="payment-summary">
        <div>
          <dt>Total payé</dt>
          <dd>{totalPaid.toFixed(2)} €</dd>
        </div>
        {priceNumber != null && (
          <div>
            <dt>Prix</dt>
            <dd>{priceNumber.toFixed(2)} €</dd>
          </div>
        )}
        {priceNumber != null && totalPaid < priceNumber && (
          <div>
            <dt>Reste</dt>
            <dd style={{ color: 'var(--color-accent-dark)' }}>{(priceNumber - totalPaid).toFixed(2)} €</dd>
          </div>
        )}
      </dl>

      {error && <p className="error-text">{error}</p>}

      {payments.length > 0 && compact && (
        <ul className="card-list" style={{ marginBottom: 'var(--space-4)' }}>
          {payments.map((p) => (
            <li key={p.id} className="list-card">
              <div className="list-card__main">
                <strong>{Number(p.amount).toFixed(2)} €</strong>
                <span className="list-card__sub">
                  {new Date(p.paidAt).toLocaleDateString('fr-FR')}{p.method ? ` · ${p.method}` : ''}
                </span>
                {p.notes && <span className="list-card__meta">{p.notes}</span>}
              </div>
              <button type="button" onClick={() => handleDelete(p.id)} className="more-btn" aria-label="Supprimer ce paiement">
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {payments.length > 0 && !compact && (
        <div className="table-wrap" style={{ marginBottom: '0.9rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th className="col-num">Montant</th>
              <th>Mode</th>
              <th>Notes</th>
              <th className="col-actions"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.paidAt).toLocaleDateString('fr-FR')}</td>
                <td className="col-num">{Number(p.amount).toFixed(2)} €</td>
                <td>{p.method || '—'}</td>
                <td>{p.notes || '—'}</td>
                <td className="col-actions">
                  <button type="button" onClick={() => handleDelete(p.id)} className="btn btn-danger-outline btn-icon" aria-label="Supprimer ce paiement" title="Supprimer">
                    <Icon name="trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <form onSubmit={handleAdd} className="payment-form">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="Montant (€)"
          aria-label="Montant en euros"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
          className="input"
        />
        <input
          placeholder="Mode (virement, espèces...)"
          aria-label="Mode de paiement"
          value={form.method}
          onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
          className="input"
        />
        <input
          type="date"
          aria-label="Date du paiement"
          value={form.paidAt}
          onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
          className="input"
        />
        <input
          placeholder="Notes"
          aria-label="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="input"
        />
        <button type="submit" disabled={saving} className="btn btn-outline">+ Ajouter</button>
      </form>
    </div>
  );
}
