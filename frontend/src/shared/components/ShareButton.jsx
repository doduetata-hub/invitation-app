import { useEffect, useState } from 'react';
import Icon from '../../admin/components/ui/Icon';

// Partage par le menu du téléphone (WhatsApp, e-mail, messages…). Le bouton n'apparaît que si l'appareil le propose
// (navigateur récent, page en HTTPS ou sur localhost). Quand une image de QR code est fournie, elle est préparée à
// l'avance : le partage doit partir au moment même du toucher.
export default function ShareButton({ title, url, qrUrl, fileName, className = 'btn btn-outline btn-sm', label = 'Partager' }) {
  const available = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const [file, setFile] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!available || !qrUrl || !navigator.canShare) return undefined;
    let cancelled = false;
    fetch(qrUrl)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!cancelled && blob) setFile(new File([blob], fileName || 'qrcode.png', { type: blob.type || 'image/png' }));
      })
      .catch(() => {}); // sans image, on partage le lien seul
    return () => {
      cancelled = true;
    };
  }, [available, qrUrl, fileName]);

  if (!available) return null;

  const share = async () => {
    setFailed(false);
    const withFile = file && navigator.canShare?.({ files: [file] });
    try {
      await navigator.share(withFile ? { files: [file], title, text: url } : { title, url });
    } catch (err) {
      if (err.name !== 'AbortError') setFailed(true); // AbortError : la personne a refermé le menu
    }
  };

  return (
    <button type="button" className={className} onClick={share}>
      <Icon name="share" />
      {failed ? 'Partage impossible' : label}
    </button>
  );
}
