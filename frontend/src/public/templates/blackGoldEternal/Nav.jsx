import { useEffect, useState } from 'react';
import { splitNames, isDisabled, mediaOf } from './utils';
import { Alliance } from './icons';

// Navigation compacte fixée en haut : n'affiche que les liens dont la section existe réellement.
// Mobile : marque + RSVP + menu ; à partir de 900 px, tous les liens sont visibles.
export default function Nav({ invitation }) {
  const [open, setOpen] = useState(false);
  const n = splitNames(invitation.namesLine);
  const brand = n.second ? `${n.first} & ${n.second}` : n.first || invitation.title;
  const { gallery } = mediaOf(invitation);
  const rsvpOn = !isDisabled(invitation, 'rsvp');
  const links = [
    { href: '#top', label: 'Accueil' },
    (invitation.events || []).length > 0 && !isDisabled(invitation, 'program') && { href: '#program', label: 'Programme' },
    gallery.length > 0 && !isDisabled(invitation, 'gallery') && { href: '#gallery', label: 'Galerie' },
    rsvpOn && !invitation.guestbookClosed && { href: '#guestbook', label: "Livre d'or" },
    rsvpOn && { href: '#closing', label: 'Contact' },
  ].filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <nav className="bge-nav" aria-label="Navigation de l'invitation">
      <a className="bge-nav__brand" href="#top" onClick={() => setOpen(false)}>
        <Alliance className="bge-nav__logo" />
        <span>{brand}</span>
      </a>
      <ul className={`bge-nav__links${open ? ' is-open' : ''}`} id="bge-menu">
        {links.map((l) => (
          <li key={l.href}><a href={l.href} onClick={() => setOpen(false)}>{l.label}</a></li>
        ))}
      </ul>
      {rsvpOn && <a className="bge-pill bge-nav__rsvp" href="#rsvp">RSVP</a>}
      <button type="button" className="bge-nav__burger" aria-expanded={open} aria-controls="bge-menu" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setOpen((v) => !v)}>
        <span /><span /><span />
      </button>
    </nav>
  );
}
