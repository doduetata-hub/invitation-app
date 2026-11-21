const express = require('express');
const prisma = require('../db/prismaClient');

const { ensureCodeTemplates } = require('../services/templateCatalog.service');

const router = express.Router();

router.get('/', async (req, res) => {
  // Ajoute (sans jamais modifier) les templates fournis par le code et absents de la base : voir templateCatalog.service.js.
  await ensureCodeTemplates(prisma);
  const templates = await prisma.invitationTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(templates);
});

module.exports = router;
