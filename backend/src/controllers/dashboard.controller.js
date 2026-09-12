const prisma = require('../db/prismaClient');

const STATUSES = ['DRAFT', 'IN_PROGRESS', 'READY', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED'];

async function getSummary(req, res) {
  const [statusGroups, clientsTotal, answerGroups, pendingGuests, recentInvitations] = await Promise.all([
    prisma.invitation.groupBy({ by: ['status'], _count: true }),
    prisma.client.count(),
    prisma.rsvp.groupBy({ by: ['answer'], _count: true }),
    prisma.guest.count({ where: { rsvp: { is: null } } }),
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
    rsvp: {
      confirmed: byAnswer.YES,
      declined: byAnswer.NO,
      pending: pendingGuests,
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
