const env = require('../config/env');

// Une URL de média est soit relative ("/uploads/...", stockage local) soit déjà absolue
// (stockage S3/R2) — dans les deux cas, une simple requête HTTP suffit à en récupérer le
// contenu, sans avoir à connaître le pilote de stockage réellement configuré ici.
async function fetchMediaBytes(url) {
  const fullUrl = /^https?:\/\//i.test(url) ? url : `${env.publicBaseUrl}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`Impossible de récupérer le média (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { fetchMediaBytes };
