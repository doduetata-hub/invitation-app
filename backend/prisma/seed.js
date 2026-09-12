const bcrypt = require('bcrypt');
const prisma = require('../src/db/prismaClient');
const env = require('../src/config/env');

async function main() {
  if (!env.adminEmail || !env.adminPassword) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env pour le seed');
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email: env.adminEmail },
    update: { passwordHash },
    create: { email: env.adminEmail, passwordHash },
  });

  console.log(`Compte admin prêt : ${admin.email}`);

  const templates = [
    { key: 'mariage-elegant', name: 'Mariage Élégant', category: 'mariage' },
    { key: 'mariage-romantique', name: 'Mariage Romantique', category: 'mariage' },
    { key: 'mariage-moderne', name: 'Mariage Moderne', category: 'mariage' },
    { key: 'mariage-traditionnel', name: 'Mariage Traditionnel', category: 'mariage' },
    { key: 'anniversaire', name: 'Anniversaire', category: 'anniversaire' },
    { key: 'bapteme', name: 'Baptême', category: 'bapteme' },
    { key: 'fiancailles', name: 'Fiançailles', category: 'fiancailles' },
    { key: 'professionnel', name: 'Événement professionnel', category: 'professionnel' },
    { key: 'luxury-wedding-gold', name: 'Luxury Wedding Gold', category: 'mariage' },
  ];

  for (const t of templates) {
    await prisma.invitationTemplate.upsert({
      where: { key: t.key },
      update: { name: t.name, category: t.category },
      create: t,
    });
  }

  console.log(`${templates.length} templates prêts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
