const prisma = require('../db/prismaClient');
const { generateUniqueSlug } = require('../services/slug.service');
const { generateUniqueClientAccessToken, generateUniqueCheckinAccessToken } = require('../services/clientAccessToken.service');
// Chemin explicite (pas juste "../services/storage") : la résolution implicite d'un
// index.js de dossier n'est pas toujours tracée correctement par l'empaquetage des
// fonctions serverless Vercel, qui a fini par exclure ce module du bundle déployé.
const storage = require('../services/storage/index.js');

const STATUSES = ['DRAFT', 'IN_PROGRESS', 'READY', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED'];
const PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID'];
const VALID_SECTIONS = ['cover', 'countdown', 'program', 'gallery', 'map', 'rsvp', 'contact'];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.publicMessage = message;
  throw err;
}

function validateTheme(theme) {
  if (theme == null) return null;
  if (typeof theme !== 'object' || Array.isArray(theme)) badRequest('Theme invalide');

  const { colors, fonts, sectionsOrder, disabledSections } = theme;

  if (colors !== undefined && (typeof colors !== 'object' || Array.isArray(colors))) {
    badRequest('theme.colors invalide');
  }
  if (fonts !== undefined && (typeof fonts !== 'object' || Array.isArray(fonts))) {
    badRequest('theme.fonts invalide');
  }
  if (sectionsOrder !== undefined) {
    if (!Array.isArray(sectionsOrder) || sectionsOrder.some((s) => !VALID_SECTIONS.includes(s))) {
      badRequest('theme.sectionsOrder invalide');
    }
  }
  if (disabledSections !== undefined) {
    if (!Array.isArray(disabledSections) || disabledSections.some((s) => !VALID_SECTIONS.includes(s))) {
      badRequest('theme.disabledSections invalide');
    }
  }

  return { colors, fonts, sectionsOrder, disabledSections };
}

function toInvitationInput(body) {
  const {
    eventType,
    title,
    namesLine,
    eventDate,
    eventTime,
    venueName,
    address,
    latitude,
    longitude,
    invitationText,
    personalMessage,
    dressCode,
    musicUrl,
    price,
    paymentStatus,
    theme,
  } = body || {};

  const data = {
    eventType: eventType?.trim(),
    title: title?.trim(),
    namesLine: namesLine?.trim() || null,
    eventDate: eventDate ? new Date(eventDate) : null,
    eventTime: eventTime?.trim() || null,
    venueName: venueName?.trim() || null,
    address: address?.trim() || null,
    latitude: latitude === '' || latitude == null ? null : Number(latitude),
    longitude: longitude === '' || longitude == null ? null : Number(longitude),
    invitationText: invitationText?.trim() || null,
    personalMessage: personalMessage?.trim() || null,
    dressCode: dressCode?.trim() || null,
    price: price === '' || price == null ? null : price,
  };

  // La musique est gérée à part par MusicUploader (upload direct + PATCH dédié) : ce
  // formulaire ne porte jamais ce champ, donc l'écrire inconditionnellement ici l'effaçait
  // silencieusement à chaque simple sauvegarde de l'éditeur (titre, date, thème...).
  if (musicUrl !== undefined) {
    data.musicUrl = musicUrl?.trim() || null;
  }

  if (paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      badRequest('Statut de paiement invalide');
    }
    data.paymentStatus = paymentStatus;
  }

  if (theme !== undefined) {
    data.theme = validateTheme(theme);
  }

  return data;
}

async function list(req, res) {
  const { clientId, status, q } = req.query;

  const where = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { namesLine: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ];
  }

  const invitations = await prisma.invitation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      template: { select: { id: true, key: true, name: true } },
    },
  });

  res.json(invitations);
}

async function getById(req, res) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      template: true,
      events: { orderBy: { order: 'asc' } },
      media: { orderBy: { order: 'asc' } },
      _count: { select: { guests: true } },
    },
  });

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  res.json(invitation);
}

async function create(req, res) {
  const { clientId, templateId, slug } = req.body || {};

  if (!clientId || !templateId) {
    return res.status(400).json({ error: 'Client et template sont requis' });
  }

  const data = toInvitationInput(req.body);
  if (!data.eventType || !data.title) {
    return res.status(400).json({ error: "Le type d'événement et le titre sont requis" });
  }

  const [client, template] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.invitationTemplate.findUnique({ where: { id: templateId } }),
  ]);
  if (!client) return res.status(400).json({ error: 'Client introuvable' });
  if (!template) return res.status(400).json({ error: 'Template introuvable' });

  const finalSlug = await generateUniqueSlug(slug || data.namesLine || data.title);

  const invitation = await prisma.invitation.create({
    data: { ...data, clientId, templateId, slug: finalSlug },
  });

  res.status(201).json(invitation);
}

async function update(req, res) {
  const existing = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const data = toInvitationInput(req.body);
  if (!data.eventType || !data.title) {
    return res.status(400).json({ error: "Le type d'événement et le titre sont requis" });
  }

  const { templateId, slug } = req.body || {};
  if (templateId) {
    const template = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });
    if (!template) return res.status(400).json({ error: 'Template introuvable' });
    data.templateId = templateId;
  }

  if (slug && slug !== existing.slug) {
    data.slug = await generateUniqueSlug(slug, existing.id);
  }

  const invitation = await prisma.invitation.update({
    where: { id: req.params.id },
    data,
  });

  res.json(invitation);
}

async function updateStatus(req, res) {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const existing = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const data = { status };
  if (status === 'PUBLISHED' && !existing.publishedAt) {
    data.publishedAt = new Date();
  }

  const invitation = await prisma.invitation.update({
    where: { id: req.params.id },
    data,
  });

  res.json(invitation);
}

async function remove(req, res) {
  try {
    const media = await prisma.media.findMany({ where: { invitationId: req.params.id } });
    await prisma.invitation.delete({ where: { id: req.params.id } });
    await Promise.all(media.map((m) => storage.remove(m.url)));
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Invitation introuvable' });
    }
    throw err;
  }
}

// Émet (ou renouvelle) le token d'accès client de cette invitation. Renouveler invalide
// immédiatement l'ancien lien déjà partagé — utile si le lien a fuité.
async function regenerateClientAccessToken(req, res) {
  const existing = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const clientAccessToken = await generateUniqueClientAccessToken();
  const invitation = await prisma.invitation.update({
    where: { id: req.params.id },
    data: { clientAccessToken },
  });

  res.json({ clientAccessToken: invitation.clientAccessToken });
}

async function revokeClientAccessToken(req, res) {
  try {
    await prisma.invitation.update({
      where: { id: req.params.id },
      data: { clientAccessToken: null },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Invitation introuvable' });
    }
    throw err;
  }
}

// Lien distinct, à déléguer à la personne qui filtre l'entrée jour J : elle ne peut jamais
// créer/modifier/supprimer un invité avec ce token, seulement scanner/rechercher et pointer.
async function regenerateCheckinAccessToken(req, res) {
  const existing = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const checkinAccessToken = await generateUniqueCheckinAccessToken();
  const invitation = await prisma.invitation.update({
    where: { id: req.params.id },
    data: { checkinAccessToken },
  });

  res.json({ checkinAccessToken: invitation.checkinAccessToken });
}

async function revokeCheckinAccessToken(req, res) {
  try {
    await prisma.invitation.update({
      where: { id: req.params.id },
      data: { checkinAccessToken: null },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Invitation introuvable' });
    }
    throw err;
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  regenerateClientAccessToken,
  revokeClientAccessToken,
  regenerateCheckinAccessToken,
  revokeCheckinAccessToken,
};
