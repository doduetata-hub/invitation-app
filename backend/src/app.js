require('express-async-errors');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const clientsRoutes = require('./routes/clients.routes');
const invitationsRoutes = require('./routes/invitations.routes');
const eventsRoutes = require('./routes/events.routes');
const templatesRoutes = require('./routes/templates.routes');
const guestsRoutes = require('./routes/guests.routes');
const mediaRoutes = require('./routes/media.routes');
const publicRoutes = require('./routes/public.routes');
const shareRoutes = require('./routes/share.routes');
const clientAccessRoutes = require('./routes/clientAccess.routes');
const checkinAccessRoutes = require('./routes/checkinAccess.routes');
const paymentsRoutes = require('./routes/payments.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const rsvpsRoutes = require('./routes/rsvps.routes');
const guestbookEntriesRoutes = require('./routes/guestbookEntries.routes');
const guestbookQrTokensRoutes = require('./routes/guestbookQrTokens.routes');
const guestbookAccessRoutes = require('./routes/guestbookAccess.routes');
const env = require('./config/env');

const app = express();

// Toujours servi derrière un unique proxy de confiance (Nginx en VPS, ou l'edge Vercel en
// serverless) : un seul saut dans les deux cas. `true` (faire confiance à toute la chaîne)
// est rejeté par express-rate-limit (ERR_ERL_PERMISSIVE_TRUST_PROXY) car exploitable si le
// nombre de sauts n'est pas garanti — on déclare donc explicitement "exactement 1 saut".
app.set('trust proxy', 1);

app.use(helmet());
// Le flux SSE du mode écran (guestbook/display/:slug/stream) doit être exclu de la
// compression : `compression` bufferise la réponse pour construire ses frames gzip, ce qui va
// totalement à l'encontre d'un flux censé pousser chaque événement immédiatement. Sans ce
// filtre, la connexion reste bloquée en attente côté client (constaté avec un vrai navigateur :
// EventSource ne quitte jamais CONNECTING, alors qu'un client sans Accept-Encoding comme un
// simple curl passait au travers sans jamais révéler le problème).
app.use(
  compression({
    filter: (req, res) => {
      if (req.path.endsWith('/stream')) return false;
      return compression.filter(req, res);
    },
  })
);
app.use(
  cors({
    origin: env.publicBaseUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Les fichiers uploadés sont content-addressés (nom = UUID généré à l'upload, jamais réécrit
// en place) : ils peuvent donc être mis en cache indéfiniment côté navigateur/CDN.
app.use(
  '/uploads',
  express.static(env.uploadsDir, {
    maxAge: '1y',
    immutable: true,
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', requireAuth, clientsRoutes);
app.use('/api/invitations', requireAuth, invitationsRoutes);
app.use('/api/events', requireAuth, eventsRoutes);
app.use('/api/templates', requireAuth, templatesRoutes);
app.use('/api/guests', requireAuth, guestsRoutes);
app.use('/api/media', requireAuth, mediaRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/client-access', clientAccessRoutes);
app.use('/api/checkin-access', checkinAccessRoutes);
app.use('/api/payments', requireAuth, paymentsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/rsvps', requireAuth, rsvpsRoutes);
app.use('/api/guestbook-entries', requireAuth, guestbookEntriesRoutes);
app.use('/api/guestbook-qr-tokens', requireAuth, guestbookQrTokensRoutes);
app.use('/api/guestbook', guestbookAccessRoutes);

app.use(errorHandler);

module.exports = app;
