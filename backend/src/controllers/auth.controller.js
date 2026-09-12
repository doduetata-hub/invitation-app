const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaClient');
const env = require('../config/env');
const { COOKIE_NAME } = require('../middleware/auth');
const { sendMail } = require('../services/email.service');

const RESET_PURPOSE = 'password-reset';

// Empreinte courte du hash de mot de passe actuel : incluse dans le token de reset pour le rendre
// à usage unique sans avoir besoin d'une table de révocation — dès que le mot de passe change
// (via ce token ou tout autre moyen), l'empreinte ne correspond plus et le token devient invalide.
function passwordFingerprint(passwordHash) {
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = jwt.sign({ sub: admin.id, email: admin.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ id: admin.id, email: admin.email });
}

async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.status(204).send();
}

async function me(req, res) {
  res.json({ id: req.admin.id, email: req.admin.email });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
  }

  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
  const passwordMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

  res.status(204).send();
}

async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });

  // Réponse identique que le compte existe ou non, pour ne pas laisser deviner les emails valides.
  if (admin) {
    const token = jwt.sign(
      { sub: admin.id, purpose: RESET_PURPOSE, pwfp: passwordFingerprint(admin.passwordHash) },
      env.jwtSecret,
      { expiresIn: '15m' }
    );
    const link = `${env.publicBaseUrl}/admin/reset-password?token=${token}`;

    await sendMail({
      to: admin.email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 15 minutes) : ${link}`,
      html: `<p>Cliquez sur ce lien pour choisir un nouveau mot de passe (valable 15 minutes) :</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  res.status(204).send();
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Lien invalide' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(400).json({ error: 'Lien invalide ou expiré' });
  }

  if (payload.purpose !== RESET_PURPOSE) {
    return res.status(400).json({ error: 'Lien invalide' });
  }

  const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
  if (!admin || passwordFingerprint(admin.passwordHash) !== payload.pwfp) {
    return res.status(400).json({ error: 'Ce lien a déjà été utilisé ou n\'est plus valide' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

  res.status(204).send();
}

module.exports = { login, logout, me, changePassword, forgotPassword, resetPassword };
