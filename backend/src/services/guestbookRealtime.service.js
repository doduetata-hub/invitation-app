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

function broadcast(invitationId, event, data) {
  const set = subscribersByInvitation.get(invitationId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}

module.exports = { subscribe, broadcast };
