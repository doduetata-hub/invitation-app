// Registre SSE en mémoire, par process — ce projet n'a aucune infra temps réel existante
// (pas de Redis, pas de socket.io) et tourne en un seul replica backend (voir docker-compose),
// donc un simple Map suffit : pas besoin de pub/sub inter-process. Si le backend redémarre,
// les connexions SSE ouvertes se referment et le navigateur du mode écran les rouvre tout seul
// (EventSource se reconnecte automatiquement nativement).
const { toPublicEntry } = require('./guestbookPhoto.service');

const subscribersByInvitation = new Map();

function subscribe(invitationId, res) {
  if (!subscribersByInvitation.has(invitationId)) {
    subscribersByInvitation.set(invitationId, new Set());
  }
  const set = subscribersByInvitation.get(invitationId);
  set.add(res);

  res.on('close', () => {
    set.delete(res);
    if (set.size === 0) subscribersByInvitation.delete(invitationId);
  });
}

// Ce flux est public et non authentifié (grand écran) : submissionKey/editToken (secrets
// d'idempotence/d'édition d'une entrée QR, voir schema.prisma), identifiants internes (rsvpId,
// qrTokenId, photoId) et informations de stockage n'y transitent jamais, quel que soit
// l'appelant. Liste blanche via toPublicEntry : seul ce que le grand écran affiche est émis
// (message, nom, table, origine, et l'URL/les dimensions de la photo si l'entrée en a une — pour
// cela l'appelant doit charger la relation `photo`).
function sanitizeForBroadcast(data) {
  if (!data || typeof data !== 'object') return data;
  return toPublicEntry(data);
}

function broadcast(invitationId, event, data) {
  const set = subscribersByInvitation.get(invitationId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(sanitizeForBroadcast(data))}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}

module.exports = { subscribe, broadcast };
