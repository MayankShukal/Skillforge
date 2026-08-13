const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function seed() {
  const passwordHash = await bcrypt.hash('Mayank@03', 10);
  const user = await prisma.user.upsert({
    where: { email: 'mayankshukal7890@gmail.com' },
    update: { passwordHash },
    create: {
      name: 'Mayank Shukal',
      email: 'mayankshukal7890@gmail.com',
      passwordHash: passwordHash,
      career_goal: 'Software Engineer',
      college: 'Tech University'
    }
  });
  console.log(user);
}
seed().finally(() => prisma.$disconnect());
