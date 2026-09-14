import { useState } from 'react';

// Montre le QR code ET le lien ensemble dans une seule vue : le client n'a plus besoin
// d'envoyer le lien et le QR séparément à un invité, une seule capture d'écran suffit.
export default function QrCodeModal({ title, link, qrUrl, downloadName, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="modal-close" aria-label="Fermer">✕</button>
        {title && <h3 style={{ margin: '0 0 0.9rem' }}>{title}</h3>}
        <img src={qrUrl} alt="QR Code" className="qr-image-lg" />
        <p className="modal-link-text">{link}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.9rem' }}>
          <button type="button" onClick={handleCopyLink} className="btn btn-outline btn-sm">
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
          <a href={qrUrl} download={downloadName} className="btn btn-primary btn-sm">
            Télécharger le QR
          </a>
        </div>
      </div>
    </div>
  );
}
