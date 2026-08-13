const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMoreCourses() {
  const extraCourses = [
    {
      title: "Python Programming Masterclass",
      provider: "FreeCodeCamp",
      skill: "Python",
      difficulty: "Beginner",
      url: "https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw"
    },
    {
      title: "Data Structures & Algorithms in C++",
      provider: "apna college",
      skill: "DSA",
      difficulty: "Intermediate",
      url: "https://images.unsplash.com/photo-1516116211223-4c714194389e?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=8hly31xKLI0"
    },
    {
      title: "C++ Full Course for Beginners",
      provider: "freeCodeCamp",
      skill: "C++",
      difficulty: "Beginner",
      url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=vLnPwxZdW4w"
    },
    {
      title: "Complete SQL Database Course",
      provider: "Udemy",
      skill: "SQL",
      difficulty: "Beginner",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=HXV3zeQKqGY"
    },
    {
      title: "Machine Learning Full Course 2026",
      provider: "Edureka",
      skill: "Machine Learning",
      difficulty: "Intermediate",
      url: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=GwIo3gDZCVQ"
    },
    {
      title: "React 19 & Next.js 15 Masterclass",
      provider: "FrontendMasters",
      skill: "React",
      difficulty: "Advanced",
      url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8"
    },
    {
      title: "System Design for Technical Interviews",
      provider: "ByteByteGo",
      skill: "System Design",
      difficulty: "Advanced",
      url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=bBTPHL9NwM8"
    },
    {
      title: "Docker & Kubernetes for DevOps",
      provider: "TechWorld with Nana",
      skill: "Docker",
      difficulty: "Intermediate",
      url: "https://images.unsplash.com/photo-1605745341112-85968b19335b?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=3c-iBn73dDE"
    },
    {
      title: "Git & GitHub Complete Tutorial",
      provider: "Amigoscode",
      skill: "Git",
      difficulty: "Beginner",
      url: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?q=80&w=600&auto=format&fit=crop",
      videoUrl: "https://www.youtube.com/watch?v=RGOj5yH7evk"
    }
  ];

  for (const c of extraCourses) {
    // Check if course already exists by title
    const existing = await prisma.course.findFirst({ where: { title: c.title } });
    if (!existing) {
      await prisma.course.create({ data: c });
      console.log(`Added course: ${c.title}`);
    }
  }
  console.log("Course database updated!");
}

addMoreCourses().finally(() => prisma.$disconnect());
