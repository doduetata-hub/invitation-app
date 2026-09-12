const express = require('express');
const prisma = require('../db/prismaClient');

const router = express.Router();

router.get('/', async (req, res) => {
  const templates = await prisma.invitationTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(templates);
});

module.exports = router;
