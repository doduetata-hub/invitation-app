const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;
function getTransporter() {
  if (!env.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort || 587,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    // Aucun SMTP configuré (dev par défaut) : on journalise l'email au lieu de l'envoyer,
    // pour que le flux reste testable sans serveur mail réel.
    console.log('\n[email] SMTP non configuré — email simulé :');
    console.log(`  À      : ${to}`);
    console.log(`  Objet  : ${subject}`);
    console.log(`  ${text || html}\n`);
    return { simulated: true };
  }

  return t.sendMail({ from: env.smtpFrom, to, subject, html, text });
}

module.exports = { sendMail };
