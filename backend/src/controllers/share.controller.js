const prisma = require('../db/prismaClient');
const env = require('../config/env');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// En local, un média est un chemin (/uploads/x.jpg) à compléter ; avec R2/S3, c'est déjà une adresse complète.
const absoluteUrl = (url) => (/^https?:\/\//i.test(url) ? url : `${env.publicBaseUrl}${url}`);

// Photo de l'aperçu : la couverture, sinon la première photo de la galerie (jamais une vidéo).
function previewPhoto(media) {
  const photos = media.filter((m) => !m.mimeType?.startsWith('video/'));
  return photos.find((m) => m.type === 'cover') || photos.find((m) => m.type === 'gallery') || null;
}

// Page lue par WhatsApp, Messenger… (qui n'exécutent pas l'application) pour afficher l'aperçu d'un lien d'invitation. Les robots
// y sont dirigés depuis /i/<slug> (voir vercel.json et la configuration nginx).
async function getSharePage(req, res) {
  const invitation = await prisma.invitation.findUnique({
    where: { slug: req.params.slug },
    include: { media: { where: { type: { in: ['cover', 'gallery'] } }, orderBy: { order: 'asc' } } },
  });

  if (!invitation || invitation.status !== 'PUBLISHED') {
    res.status(404).type('html').send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Invitation introuvable</title></head>
<body>Invitation introuvable.</body></html>`);
    return;
  }

  const path = `/i/${encodeURIComponent(req.params.slug)}`;
  const publicUrl = `${env.publicBaseUrl}${path}`;
  // Une personne arrivée ici est renvoyée vers l'invitation, avec son lien personnalisé. « app=1 » empêche de la ramener sur cette
  // page (voir vercel.json) : sans lui, un navigateur pris pour un robot tournerait en rond.
  const guest = typeof req.query.guest === 'string' ? req.query.guest : '';
  const appUrl = escapeHtml(`${path}?app=1${guest ? `&guest=${encodeURIComponent(guest)}` : ''}`);

  const title = escapeHtml(invitation.namesLine ? `${invitation.namesLine} — ${invitation.title}` : invitation.title);
  const description = escapeHtml(invitation.invitationText || invitation.personalMessage || '');
  const photo = previewPhoto(invitation.media);
  const imageUrl = photo ? escapeHtml(absoluteUrl(photo.url)) : null;

  res.type('html').send(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${publicUrl}">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  <meta http-equiv="refresh" content="0; url=${appUrl}">
</head>
<body>
  <p>Redirection vers l'invitation... <a href="${appUrl}">Cliquez ici si rien ne se passe</a>.</p>
</body>
</html>`);
}

module.exports = { getSharePage };
