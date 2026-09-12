const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'token';

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }
}

module.exports = { requireAuth, COOKIE_NAME };
