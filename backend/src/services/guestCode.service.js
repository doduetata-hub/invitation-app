const crypto = require('crypto');
const prisma = require('../db/prismaClient');

function randomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function generateUniqueGuestCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode();
    const existing = await prisma.guest.findUnique({ where: { guestCode: code } });
    if (!existing) return code;
  }
  throw new Error('Impossible de générer un code invité unique');
}

module.exports = { generateUniqueGuestCode };
