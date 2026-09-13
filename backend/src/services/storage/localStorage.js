const fs = require('fs/promises');
const path = require('path');
const env = require('../../config/env');

async function save(buffer, filename) {
  await fs.mkdir(env.uploadsDir, { recursive: true });
  const filePath = path.join(env.uploadsDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

async function remove(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filename = url.replace('/uploads/', '');
  const filePath = path.join(env.uploadsDir, filename);
  await fs.unlink(filePath).catch(() => {});
}

module.exports = { save, remove };
