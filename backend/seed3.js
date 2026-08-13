const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function seed() {
  const users = [
    { name: 'Shivam Shah', email: 'shivamshah1132@gmail.com', pass: 'shivam@1234' },
    { name: 'Mohit Brahmbhatt', email: 'mohitbrahmbhatt123@gmail.com', pass: 'mohit5678' },
    { name: 'Rudra Bhatt', email: 'rudrabhatt987@gmail.com', pass: 'rudra789' }
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.pass, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: passwordHash,
        career_goal: 'Software Engineer',
        college: 'Tech University'
      }
    });
    console.log(`Seeded user: ${user.email}`);
  }
}
seed().finally(() => prisma.$disconnect());
