const prisma = require('../db/prismaClient');

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function generateUniqueSlug(base, excludeId) {
  const root = slugify(base) || 'invitation';
  let slug = root;
  let counter = 2;

  while (true) {
    const existing = await prisma.invitation.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${root}-${counter}`;
    counter += 1;
  }
}

module.exports = { slugify, generateUniqueSlug };
