const crypto = require('crypto');
const prisma = require('../db/prismaClient');

// 32 octets aléatoires (~256 bits) encodés en base64url : contrairement au guestCode (8
// caractères, pensé pour être tapé/scanné), ces tokens protègent l'accès à la gestion des
// invités d'une invitation — ils doivent rester impossibles à deviner ou à brute-forcer.
function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// `field` doit être une colonne unique de Invitation ("clientAccessToken" ou
// "checkinAccessToken") : les deux liens sont volontairement des tokens indépendants pour que
// le client puisse déléguer le SEUL contrôle d'accès jour J à une tierce personne (celle qui
// filtre l'entrée) sans jamais lui donner le pouvoir de créer/modifier/supprimer des invités.
async function generateUniqueAccessToken(field) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = randomToken();
    const existing = await prisma.invitation.findUnique({ where: { [field]: token } });
    if (!existing) return token;
  }
  throw new Error("Impossible de générer un token d'accès unique");
}

const generateUniqueClientAccessToken = () => generateUniqueAccessToken('clientAccessToken');
const generateUniqueCheckinAccessToken = () => generateUniqueAccessToken('checkinAccessToken');

module.exports = { generateUniqueClientAccessToken, generateUniqueCheckinAccessToken };
