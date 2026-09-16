const prisma = require('../db/prismaClient');

const STATUSES = ['DRAFT', 'IN_PROGRESS', 'READY', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED'];

async function getSummary(req, res) {
  const [statusGroups, clientsTotal, answerGroups, pendingGuests, guestsTotal, confirmedPersons, recentInvitations] = await Promise.all([
    prisma.invitation.groupBy({ by: ['status'], _count: true }),
    prisma.client.count(),
    prisma.rsvp.groupBy({ by: ['answer'], _count: true }),
    prisma.guest.count({ where: { rsvp: { is: null } } }),
    prisma.guest.count(),
    // Somme des personnes réellement déclarées par les invités (Rsvp.numberOfPersons), pas le
    // plafond maxPersons fixé sur le lien : un invité autorisé pour 2 peut ne confirmer qu'1
    // seule présence, et c'est ce chiffre-ci — pas le nombre de liens/invitations — qui compte.
    // prisma.rsvp couvre à la fois les liens personnalisés et les réponses via le lien général.
    prisma.rsvp.aggregate({ where: { answer: 'YES' }, _sum: { numberOfPersons: true } }),
    prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { client: { select: { firstName: true, lastName: true } }, template: { select: { name: true } } },
    }),
  ]);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const g of statusGroups) byStatus[g.status] = g._count;

  const byAnswer = { YES: 0, NO: 0 };
  for (const g of answerGroups) {
    if (g.answer === 'YES' || g.answer === 'NO') byAnswer[g.answer] = g._count;
  }

  res.json({
    invitations: {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus,
    },
    clients: { total: clientsTotal },
    // "guests" ici = liens personnalisés envoyés (une invitation personnalisée par invité/famille),
    // distinct du nombre réel de personnes attendues (rsvp.personsConfirmed) : un lien avec
    // maxPersons=2 reste UN lien, pas deux.
    guests: { total: guestsTotal },
    rsvp: {
      confirmed: byAnswer.YES,
      declined: byAnswer.NO,
      pending: pendingGuests,
      personsConfirmed: confirmedPersons._sum.numberOfPersons || 0,
    },
    recentInvitations: recentInvitations.map((inv) => ({
      id: inv.id,
      title: inv.title,
      status: inv.status,
      createdAt: inv.createdAt,
      clientName: `${inv.client.firstName} ${inv.client.lastName}`,
      templateName: inv.template.name,
    })),
  });
}

module.exports = { getSummary };
