const crypto = require('crypto');
const prisma = require('../db/prismaClient');
// Chemin explicite : voir le commentaire équivalent dans invitations.controller.js.
const storage = require('../services/storage/index.js');
const { processImage } = require('../services/image.service');
const { ALLOWED_VIDEO_TYPES } = require('../middleware/upload');
const env = require('../config/env');

const MEDIA_TYPES = ['cover', 'gallery'];

const VIDEO_EXTENSIONS = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
};

async function upload(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }

  const type = MEDIA_TYPES.includes(req.body?.type) ? req.body.type : 'gallery';
  const isVideo = ALLOWED_VIDEO_TYPES.includes(req.file.mimetype);

  if (isVideo && type === 'cover') {
    return res.status(400).json({ error: 'La couverture doit être une image, pas une vidéo' });
  }

  let buffer;
  let ext;
  let mimeType;

  if (isVideo) {
    // Pas de transcodage/compression vidéo (nécessiterait ffmpeg) : le fichier est stocké tel quel,
    // sous réserve de la limite de taille (60 Mo) déjà appliquée par le middleware d'upload.
    buffer = req.file.buffer;
    ext = VIDEO_EXTENSIONS[req.file.mimetype] || 'mp4';
    mimeType = req.file.mimetype;
  } else {
    const processed = await processImage(req.file.buffer, {
      maxWidth: type === 'cover' ? 1600 : 1200,
      mimetype: req.file.mimetype,
    });
    buffer = processed.buffer;
    ext = processed.ext;
    mimeType = processed.contentType;
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const url = await storage.save(buffer, filename);

  if (type === 'cover') {
    const existingCovers = await prisma.media.findMany({
      where: { invitationId: req.params.id, type: 'cover' },
    });
    await Promise.all(existingCovers.map((m) => storage.remove(m.url)));
    await prisma.media.deleteMany({ where: { invitationId: req.params.id, type: 'cover' } });
  }

  const count = await prisma.media.count({ where: { invitationId: req.params.id, type } });

  const media = await prisma.media.create({
    data: { invitationId: req.params.id, type, url, mimeType, order: count },
  });

  res.status(201).json(media);
}

// Les fonctions serverless Vercel refusent toute requête entrante au-delà de 4,5 Mo — bien
// en dessous des tailles réelles de photos/vidéos. Le navigateur dépose donc le fichier
// directement dans R2 via cette URL signée, sans jamais passer par la fonction ; seule la
// finalisation (traitement image + écriture en base) transite par le backend.
async function presignMedia(req, res) {
  if (env.storageDriver !== 's3') {
    return res.json({ supported: false });
  }

  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { contentType } = req.body || {};
  const rawKey = `raw-${crypto.randomUUID()}`;
  const uploadUrl = await storage.getPresignedUploadUrl(rawKey, contentType);
  res.json({ supported: true, uploadUrl, rawKey });
}

async function finalizeMedia(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { rawKey, mimeType } = req.body || {};
  if (!rawKey || !mimeType) {
    return res.status(400).json({ error: 'rawKey et mimeType requis' });
  }

  const type = MEDIA_TYPES.includes(req.body?.type) ? req.body.type : 'gallery';
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

  if (isVideo && type === 'cover') {
    await storage.remove(storage.publicUrl(rawKey));
    return res.status(400).json({ error: 'La couverture doit être une image, pas une vidéo' });
  }

  const rawBuffer = await storage.fetchByKey(rawKey);

  let buffer;
  let ext;
  let finalMimeType;

  if (isVideo) {
    buffer = rawBuffer;
    ext = VIDEO_EXTENSIONS[mimeType] || 'mp4';
    finalMimeType = mimeType;
  } else {
    const processed = await processImage(rawBuffer, {
      maxWidth: type === 'cover' ? 1600 : 1200,
      mimetype: mimeType,
    });
    buffer = processed.buffer;
    ext = processed.ext;
    finalMimeType = processed.contentType;
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const url = await storage.save(buffer, filename);
  await storage.remove(storage.publicUrl(rawKey));

  if (type === 'cover') {
    const existingCovers = await prisma.media.findMany({
      where: { invitationId: req.params.id, type: 'cover' },
    });
    await Promise.all(existingCovers.map((m) => storage.remove(m.url)));
    await prisma.media.deleteMany({ where: { invitationId: req.params.id, type: 'cover' } });
  }

  const count = await prisma.media.count({ where: { invitationId: req.params.id, type } });

  const media = await prisma.media.create({
    data: { invitationId: req.params.id, type, url, mimeType: finalMimeType, order: count },
  });

  res.status(201).json(media);
}

async function remove(req, res) {
  const media = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!media) {
    return res.status(404).json({ error: 'Media introuvable' });
  }

  await storage.remove(media.url);
  await prisma.media.delete({ where: { id: req.params.id } });

  res.status(204).send();
}

async function update(req, res) {
  const { order } = req.body || {};
  const data = {};
  if (order !== undefined) data.order = Number(order);

  try {
    const media = await prisma.media.update({ where: { id: req.params.id }, data });
    res.json(media);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Media introuvable' });
    }
    throw err;
  }
}

const AUDIO_EXTENSIONS = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
};

async function uploadMusic(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }

  const ext = AUDIO_EXTENSIONS[req.file.mimetype] || 'mp3';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const url = await storage.save(req.file.buffer, filename);

  if (invitation.musicUrl) {
    await storage.remove(invitation.musicUrl);
  }

  const updated = await prisma.invitation.update({
    where: { id: req.params.id },
    data: { musicUrl: url },
  });

  res.status(201).json({ musicUrl: updated.musicUrl });
}

async function presignMusic(req, res) {
  if (env.storageDriver !== 's3') {
    return res.json({ supported: false });
  }

  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { contentType } = req.body || {};
  // Pas de traitement pour l'audio : la clé déposée est directement la clé finale, la
  // finalisation ne fait donc qu'enregistrer l'URL en base, sans réupload.
  const ext = AUDIO_EXTENSIONS[contentType] || 'mp3';
  const rawKey = `${crypto.randomUUID()}.${ext}`;
  const uploadUrl = await storage.getPresignedUploadUrl(rawKey, contentType);
  res.json({ supported: true, uploadUrl, rawKey });
}

async function finalizeMusic(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { rawKey } = req.body || {};
  if (!rawKey) {
    return res.status(400).json({ error: 'rawKey requis' });
  }

  const url = storage.publicUrl(rawKey);
  if (invitation.musicUrl) {
    await storage.remove(invitation.musicUrl);
  }

  const updated = await prisma.invitation.update({
    where: { id: req.params.id },
    data: { musicUrl: url },
  });

  res.status(201).json({ musicUrl: updated.musicUrl });
}

async function removeMusic(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  if (invitation.musicUrl) {
    await storage.remove(invitation.musicUrl);
  }

  await prisma.invitation.update({ where: { id: req.params.id }, data: { musicUrl: null } });
  res.status(204).send();
}

module.exports = {
  upload,
  remove,
  update,
  uploadMusic,
  removeMusic,
  presignMedia,
  finalizeMedia,
  presignMusic,
  finalizeMusic,
};
