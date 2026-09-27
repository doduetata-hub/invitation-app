const env = require('../config/env');

// Relaie un média déjà public (photo de livre d'or, musique de fond) pour un usage qui a besoin
// de LIRE ses octets depuis le navigateur (canvas, fetch) plutôt que de juste l'afficher/l'écouter
// — la génération vidéo du livre d'or (100% côté navigateur) en a besoin pour dessiner les photos
// sur un <canvas> puis exporter ses pixels, et pour récupérer la musique en entrée de ffmpeg.wasm.
// Un <img>/<audio> classique n'a besoin d'aucun en-tête CORS pour s'afficher/jouer, mais relire
// les octets depuis JavaScript (canvas.getImageData, fetch) l'exige — or le bucket S3/R2 utilisé
// en production n'en envoie pas par défaut, ce qui faisait échouer photos ET musique en silence
// (chaque échec étant traité comme "média absent", jamais comme une erreur à afficher). Ici, la
// requête part du serveur (jamais soumise au CORS du navigateur), et la réponse est servie depuis
// NOTRE PROPRE domaine (même origine que la page) : le navigateur n'a alors plus de restriction
// CORS à appliquer, quels que soient les en-têtes du stockage d'origine.
//
// Limité aux URLs de NOTRE stockage (jamais une URL arbitraire fournie par le client) : sans ce
// filtre, ce serait une porte ouverte pour faire relayer des requêtes serveur vers n'importe quel
// hôte (SSRF).
function isAllowedMediaUrl(url) {
  try {
    const parsed = new URL(url);
    const allowedOrigins = [env.s3PublicBaseUrl, env.s3Endpoint, env.publicBaseUrl]
      .filter(Boolean)
      .map((u) => new URL(u).origin);
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

async function proxyMedia(req, res) {
  const { url } = req.query;
  if (!url || typeof url !== 'string' || !isAllowedMediaUrl(url)) {
    return res.status(400).json({ error: 'URL de média invalide' });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: 'Média introuvable' });
  }

  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) res.setHeader('Content-Length', contentLength);
  // Immuable une fois déposé (nom de fichier unique par upload) : cache long côté navigateur,
  // utile si l'admin régénère la vidéo plusieurs fois de suite.
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

  res.send(Buffer.from(await upstream.arrayBuffer()));
}

module.exports = { proxyMedia };
