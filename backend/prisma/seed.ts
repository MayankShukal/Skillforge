import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import bcrypt from 'bcrypt'

async function main() {
  console.log('Start seeding...')

  // Clean existing data
  await prisma.roadmapTask.deleteMany()
  await prisma.roadmap.deleteMany()
  await prisma.interviewQuestion.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.progress.deleteMany()
  await prisma.course.deleteMany()
  await prisma.project.deleteMany()
  await prisma.resume.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password', 10);

  // 1. Create Demo User
  const user = await prisma.user.create({
    data: {
      name: 'Alex Sharma',
      email: 'alex@example.com',
      passwordHash,
      college: 'ABC Institute of Technology',
      degree: 'B.Tech',
      branch: 'Computer Engineering',
      graduation_year: 2027,
      career_goal: 'Machine Learning Engineer',
    },
  })
  console.log(`Created user with id: ${user.id}`)

  // 2. Create Skills
  const skills = [
    { skill_name: 'Python', level: 'Intermediate', score: 65 },
    { skill_name: 'C++', level: 'Intermediate', score: 60 },
    { skill_name: 'DSA', level: 'Intermediate', score: 70 },
    { skill_name: 'SQL', level: 'Beginner', score: 30 },
    { skill_name: 'Machine Learning', level: 'Beginner', score: 25 },
    { skill_name: 'Git', level: 'Intermediate', score: 80 },
  ]

  for (const s of skills) {
    await prisma.skill.create({
      data: {
        ...s,
        user_id: user.id,
      },
    })
  }

  // 3. Create Resume
  await prisma.resume.create({
    data: {
      user_id: user.id,
      resume_score: 78,
      extracted_text: 'Alex Sharma. B.Tech Computer Engineering. Skills: Python, C++, DSA. Projects: Library Management System.',
    },
  })

  // 4. Create Project
  await prisma.project.create({
    data: {
      user_id: user.id,
      title: 'AI Resume Analyzer',
      description: 'A tool to analyze resumes using NLP.',
      technologies: 'Python, NLP, FastAPI, React',
      status: 'In Progress',
      progress: 35,
    },
  })

  // 5. Create Roadmap
  const roadmap = await prisma.roadmap.create({
    data: {
      user_id: user.id,
      target_role: 'Machine Learning Engineer',
      progress: 25,
    },
  })

  // 6. Create Roadmap Tasks
  const tasks = [
    { title: 'Data Foundations', description: 'Learn NumPy, Pandas, SQL', duration: '3 weeks', status: 'In Progress' },
    { title: 'Machine Learning Basics', description: 'Supervised & Unsupervised Learning', duration: '4 weeks', status: 'Pending' },
    { title: 'Build ML Portfolio', description: 'Complete 3 ML Projects', duration: '5 weeks', status: 'Pending' },
  ]
  for (const t of tasks) {
    await prisma.roadmapTask.create({
      data: {
        ...t,
        roadmap_id: roadmap.id,
      },
    })
  }

  // 7. Create Mock Courses
  const courses = [
    { title: 'Complete SQL Bootcamp', provider: 'Udemy', skill: 'SQL', difficulty: 'Beginner', url: 'https://udemy.com' },
    { title: 'Machine Learning A-Z', provider: 'Coursera', skill: 'Machine Learning', difficulty: 'Beginner', url: 'https://coursera.org' },
  ]
  for (const c of courses) {
    await prisma.course.create({ data: c })
  }

  // 8. Create Interview Questions
  const questions = [
    { category: 'Machine Learning', difficulty: 'Beginner', question: 'What is the difference between supervised and unsupervised learning?', answer: 'Supervised learning uses labeled data, while unsupervised uses unlabeled data.' },
    { category: 'SQL', difficulty: 'Beginner', question: 'Explain INNER JOIN vs LEFT JOIN.', answer: 'INNER JOIN returns matching rows in both tables. LEFT JOIN returns all rows from the left table and matched rows from the right.' },
  ]
  for (const q of questions) {
    await prisma.interviewQuestion.create({ data: q })
  }

  // 9. Add overall progress
  await prisma.progress.create({
    data: {
      user_id: user.id,
      skill: 'Overall',
      progress: 68,
    }
  })

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
