import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// Panneau qui monte du bas de l'écran : menus d'actions et menu « Plus » sur téléphone et tablette.
export default function BottomSheet({ title, subtitle, onClose, children }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <div className="sheet__titles">
            <strong>{title}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button type="button" className="sheet__close" onClick={onClose} aria-label="Fermer">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.querySelector('.admin-root') || document.body
  );
}

// Une ligne du panneau : lien interne (`to`), lien externe (`href`) ou bouton (`onClick`).
export function SheetItem({ icon, label, to, href, target, onClick, onDone, danger, disabled }) {
  const className = `sheet__item${danger ? ' sheet__item--danger' : ''}`;
  const content = (
    <>
      <Icon name={icon} />
      <span>{label}</span>
    </>
  );
  const handle = () => {
    onClick?.();
    onDone?.();
  };
  if (to) {
    return (
      <Link to={to} target={target} className={className} onClick={handle}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target={target} rel={target ? 'noreferrer' : undefined} className={className} onClick={handle}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={() => { onDone?.(); onClick?.(); }} disabled={disabled}>
      {content}
    </button>
  );
}
