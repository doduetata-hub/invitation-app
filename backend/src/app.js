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
const paymentsRoutes = require('./routes/payments.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const rsvpsRoutes = require('./routes/rsvps.routes');
const env = require('./config/env');

const app = express();

// Le backend est toujours servi derrière le reverse proxy Nginx (1 saut).
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
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
app.use('/api/payments', requireAuth, paymentsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/rsvps', requireAuth, rsvpsRoutes);

app.use(errorHandler);

module.exports = app;
