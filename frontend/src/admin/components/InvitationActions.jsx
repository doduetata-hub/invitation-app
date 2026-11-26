import RowActions from './ui/RowActions';

// Raccourcis d'une invitation dans une liste : les mêmes pages que ses onglets. `publicSlug` n'est fourni que pour une
// invitation publiée, et ouvre alors la page vue par les invités.
export default function InvitationActions({ id, title, publicSlug }) {
  return (
    <RowActions
      title={title}
      actions={[
        { to: `/admin/invitations/${id}/edit`, icon: 'edit', label: 'Modifier' },
        { to: `/admin/invitations/${id}/guests`, icon: 'users', label: 'Invités' },
        { to: `/admin/invitations/${id}/checkin`, icon: 'userCheck', label: 'Check-in', compactOnly: true },
        { to: `/admin/invitations/${id}/guestbook`, icon: 'guestbook', label: 'Livre d’or' },
        publicSlug && { href: `/i/${publicSlug}`, target: '_blank', icon: 'eye', label: 'Voir la page publique' },
      ]}
    />
  );
}
