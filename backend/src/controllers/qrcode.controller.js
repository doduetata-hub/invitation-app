const QRCode = require('qrcode');
const prisma = require('../db/prismaClient');
const env = require('../config/env');

async function getQrCode(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const url = `${env.publicBaseUrl}/i/${invitation.slug}`;
  const buffer = await QRCode.toBuffer(url, { width: 512, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="qrcode-${invitation.slug}.png"`);
  res.send(buffer);
}

async function getGuestQrCode(req, res) {
  const guest = await prisma.guest.findUnique({
    where: { id: req.params.id },
    include: { invitation: { select: { slug: true } } },
  });
  if (!guest || !guest.guestCode) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }

  const url = `${env.publicBaseUrl}/i/${guest.invitation.slug}?guest=${guest.guestCode}`;
  const buffer = await QRCode.toBuffer(url, { width: 512, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="qrcode-${guest.guestCode}.png"`);
  res.send(buffer);
}

module.exports = { getQrCode, getGuestQrCode };
