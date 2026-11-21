const prisma = require('../db/prismaClient');
const env = require('../config/env');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// URL ABSOLUE d'une image : en stockage local le média est un chemin (« /uploads/x.jpg ») à préfixer par l'URL publique ; en R2/S3 c'est déjà
// une URL absolue (« https://pub-….r2.dev/x.jpg ») qu'il ne faut surtout pas préfixer (sinon « https://hôtehttps://… », image introuvable).
function absoluteUrl(base, url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${String(base).replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Description Open Graph : 200 caractères max (WhatsApp/Facebook tronquent de toute façon), coupée à une limite de mot, avec « … ».
function truncateDescription(text, max = 200) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

async function getSharePage(req, res) {
  const invitation = await prisma.invitation.findUnique({
    where: { slug: req.params.slug },
    include: { media: { where: { type: 'cover' }, take: 1 } },
  });

  const publicUrl = `${String(env.publicBaseUrl).replace(/\/$/, '')}/i/${encodeURIComponent(req.params.slug)}`;

  if (!invitation || invitation.status !== 'PUBLISHED') {
    res.status(404).type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Invitation introuvable</title></head>
<body>Invitation introuvable.</body></html>`);
    return;
  }

  const title = escapeHtml(invitation.namesLine ? `${invitation.namesLine} — ${invitation.title}` : invitation.title);
  const description = escapeHtml(truncateDescription(invitation.invitationText || invitation.personalMessage || ''));
  const cover = invitation.media[0];
  const imageUrl = absoluteUrl(env.publicBaseUrl, cover?.url);
  const imageSize = imageUrl && cover.width && cover.height ? { w: cover.width, h: cover.height } : null;

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
  <meta property="og:site_name" content="JHR EVENTS">
  <meta property="og:locale" content="fr_FR">
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
  ${imageUrl ? `<meta property="og:image:alt" content="${title}">` : ''}
  ${imageSize ? `<meta property="og:image:width" content="${imageSize.w}"><meta property="og:image:height" content="${imageSize.h}">` : ''}
  <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}
  <meta http-equiv="refresh" content="0; url=${publicUrl}">
</head>
<body>
  <p>Redirection vers l'invitation... <a href="${publicUrl}">Cliquez ici si rien ne se passe</a>.</p>
</body>
</html>`);
}

module.exports = { getSharePage, absoluteUrl, truncateDescription };
