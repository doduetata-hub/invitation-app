const crypto = require('crypto');
const prisma = require('../db/prismaClient');

// Même convention que clientAccessToken.service.js : 32 octets aléatoires en base64url,
// impossible à deviner/brute-forcer — contrairement au guestCode (8 caractères, pensé pour
// être tapé), ce token n'est jamais saisi à la main, seulement encodé dans un QR code.
function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

async function generateUniqueGuestbookToken() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = randomToken();
    const existing = await prisma.guestbookQrToken.findUnique({ where: { token } });
    if (!existing) return token;
  }
  throw new Error('Impossible de générer un token de livre d\'or unique');
}

module.exports = { generateUniqueGuestbookToken };
