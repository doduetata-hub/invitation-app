const prisma = require('../db/prismaClient');
const env = require('../config/env');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getSharePage(req, res) {
  const invitation = await prisma.invitation.findUnique({
    where: { slug: req.params.slug },
    include: { media: { where: { type: 'cover' }, take: 1 } },
  });

  const publicUrl = `${env.publicBaseUrl}/i/${req.params.slug}`;

  if (!invitation || invitation.status !== 'PUBLISHED') {
    res.status(404).type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Invitation introuvable</title></head>
<body>Invitation introuvable.</body></html>`);
    return;
  }

  const title = escapeHtml(invitation.namesLine ? `${invitation.namesLine} — ${invitation.title}` : invitation.title);
  const description = escapeHtml(invitation.invitationText || invitation.personalMessage || '');
  const coverUrl = invitation.media[0]?.url;
  const imageUrl = coverUrl ? `${env.publicBaseUrl}${coverUrl}` : null;

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
  <meta http-equiv="refresh" content="0; url=${publicUrl}">
</head>
<body>
  <p>Redirection vers l'invitation... <a href="${publicUrl}">Cliquez ici si rien ne se passe</a>.</p>
</body>
</html>`);
}

module.exports = { getSharePage };
