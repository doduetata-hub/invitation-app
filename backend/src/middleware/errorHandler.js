const multer = require('multer');

function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Les limites de nombre de fichiers/champs ne sont jamais atteintes par le formulaire réel :
    // ne pas relayer le texte technique de multer à un invité.
    let message = 'Envoi invalide';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Fichier trop volumineux (10 Mo maximum)';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Fichier inattendu';
    return res.status(400).json({ error: message });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: err.publicMessage || 'Internal server error',
  });
}

module.exports = errorHandler;
