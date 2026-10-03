const rateLimit = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;

// Limite générale de l'API, par adresse IP, toutes routes confondues.
const API_LIMIT = 300;

// L'écran du livre d'or (grand écran de la salle) redemande la liste des messages approuvés toutes
// les 2 secondes : 450 requêtes par fenêtre de 15 minutes pour UN seul écran, soit plus que la
// limite générale ci-dessus. Sans traitement à part, au bout d'environ 10 minutes l'écran recevait des
// erreurs 429 (messages approuvés affichés en retard) et, la limite étant partagée par IP, toute
// personne sur le même réseau (l'admin sur le Wi-Fi de la salle, par exemple) ne pouvait plus se
// connecter. Cette route publique en lecture seule a donc sa PROPRE limite, plus large mais
// toujours finie (protège la base d'un script qui l'interrogerait en boucle) : 1800 requêtes par
// fenêtre = 4 écrans ouverts en même temps derrière la même adresse.
const DISPLAY_LIMIT = 1800;

// Chemin relatif au montage `/api` : GET /api/guestbook/display/:slug. Le flux /stream n'est
// volontairement PAS concerné (il reste sous la limite générale).
const DISPLAY_DATA_PATH = /^\/guestbook\/display\/[^/]+\/?$/;

function isDisplayDataRequest(req) {
  return req.method === 'GET' && DISPLAY_DATA_PATH.test(req.path);
}

const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: API_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  // Comptée à part par displayLimiter (voir guestbookAccess.routes.js).
  skip: isDisplayDataRequest,
});

const displayLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: DISPLAY_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, displayLimiter, isDisplayDataRequest, API_LIMIT, DISPLAY_LIMIT };
