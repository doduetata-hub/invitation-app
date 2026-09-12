const crypto = require('crypto');
const prisma = require('../db/prismaClient');

// 32 octets aléatoires (~256 bits) encodés en base64url : contrairement au guestCode (8
// caractères, pensé pour être tapé/scanné), ce token protège l'accès à la gestion de TOUS
// les invités d'une invitation — il doit rester impossible à deviner ou à brute-forcer.
function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

async function generateUniqueClientAccessToken() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = randomToken();
    const existing = await prisma.invitation.findUnique({ where: { clientAccessToken: token } });
    if (!existing) return token;
  }
  throw new Error("Impossible de générer un token d'accès client unique");
}

module.exports = { generateUniqueClientAccessToken };
