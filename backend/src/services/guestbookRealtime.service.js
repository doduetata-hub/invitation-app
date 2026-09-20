// Registre SSE en mémoire, par process — ce projet n'a aucune infra temps réel existante
// (pas de Redis, pas de socket.io) et tourne en un seul replica backend (voir docker-compose),
// donc un simple Map suffit : pas besoin de pub/sub inter-process. Si le backend redémarre,
// les connexions SSE ouvertes se referment et le navigateur du mode écran les rouvre tout seul
// (EventSource se reconnecte automatiquement nativement).
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

// submissionKey/editToken (GuestbookEntry) sont des secrets internes à l'idempotence/l'édition
// d'une entrée QR (voir schema.prisma) : ce flux est public et non authentifié (grand écran),
// donc jamais question qu'ils y transitent, quel que soit l'appelant.
function sanitizeForBroadcast(data) {
  if (!data || typeof data !== 'object') return data;
  const { submissionKey, editToken, ...safe } = data;
  return safe;
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
