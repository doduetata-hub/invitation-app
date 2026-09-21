import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../shared/api/client';
import InvitationPage from './InvitationPage';
import { rememberGuestbookEntry, forgetRememberedGuestbookEntry } from '../shared/utils/guestbookMemory';

function usePageMeta(invitation) {
  useEffect(() => {
    if (!invitation) return;

    const previousTitle = document.title;
    document.title = invitation.namesLine
      ? `${invitation.namesLine} — ${invitation.title}`
      : invitation.title;

    const description = invitation.invitationText || invitation.personalMessage || '';
    let meta = document.querySelector('meta[name="description"]');
    const createdMeta = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const previousContent = meta.getAttribute('content');
    meta.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      if (createdMeta) {
        meta.remove();
      } else if (previousContent !== null) {
        meta.setAttribute('content', previousContent);
      }
    };
  }, [invitation]);
}

export default function PublicInvitationPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const guestCode = searchParams.get('guest') || '';
  const [invitation, setInvitation] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setInvitation(null);
    setNotFound(false);
    const query = guestCode ? `?guest=${encodeURIComponent(guestCode)}` : '';
    api
      .get(`/public/invitations/${slug}${query}`)
      .then(setInvitation)
      .catch(() => setNotFound(true));
  }, [slug, guestCode]);

  usePageMeta(invitation);

  const handleRsvpSubmit = async (form, { photo = null, removePhoto = false } = {}) => {
    let result;
    if (photo || removePhoto) {
      // Avec photo (ou retrait de la photo déjà jointe) : envoi multipart. Sans photo, le JSON
      // d'origine ci-dessous reste STRICTEMENT identique à avant l'ajout des photos.
      const body = new FormData();
      Object.entries({ ...form, guestCode }).forEach(([key, value]) => body.append(key, value ?? ''));
      if (removePhoto) body.append('removePhoto', 'true');
      if (photo) body.append('photo', photo, photo.name || 'photo.jpg');
      result = await api.upload(`/public/invitations/${slug}/rsvp`, body);
    } else {
      result = await api.post(`/public/invitations/${slug}/rsvp`, { ...form, guestCode });
    }
    // Se souvient (même appareil uniquement) du mot laissé ici, pour que l'invité soit
    // reconnu s'il scanne aussi un QR papier du livre d'or — voir guestbookMemory.js et
    // GuestbookQrPage.jsx. Un message vidé (RSVP resoumis sans mot) efface ce souvenir : rien
    // à reconnaître, syncGuestbookEntry a déjà supprimé l'entrée côté serveur.
    if (result.guestbookEntryId) {
      rememberGuestbookEntry(result.invitationId, { entryId: result.guestbookEntryId, guestName: form.name, message: form.message });
    } else {
      forgetRememberedGuestbookEntry(result.invitationId);
    }
  };

  if (notFound) {
    return (
      <div style={styles.center}>
        <p>Cette invitation n'existe pas ou n'est plus disponible.</p>
      </div>
    );
  }

  if (!invitation) {
    return <div style={styles.center}>Chargement...</div>;
  }

  return <InvitationPage invitation={invitation} slug={slug} onRsvpSubmit={handleRsvpSubmit} />;
}

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    color: '#6b7280',
    textAlign: 'center',
    padding: '2rem',
  },
};
