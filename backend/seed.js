const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const user = await prisma.user.upsert({
    where: { email: 'alex@example.com' },
    update: {},
    create: {
      name: 'Alex Johnson',
      email: 'alex@example.com',
      passwordHash: 'test',
      career_goal: 'Full Stack Developer',
      college: 'Tech University'
    }
  });
  console.log(user);
}
seed().finally(() => prisma.$disconnect());
