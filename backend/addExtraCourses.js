const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMoreCourses() {
  const extraCourses = [
    { title: "Python for Data Science", provider: "DataCamp", skill: "Python", difficulty: "Beginner", url: "https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw" },
    { title: "Advanced CSS Flexbox & Grid", provider: "FreeCodeCamp", skill: "CSS", difficulty: "Intermediate", url: "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=fYq5PXgSsbE" },
    { title: "Docker for DevOps", provider: "Udemy", skill: "Docker", difficulty: "Intermediate", url: "https://images.unsplash.com/photo-1605745341112-85968b19335b?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=3c-iBn73dDE" },
    { title: "Next.js 14 Full Stack Development", provider: "Vercel", skill: "Next.js", difficulty: "Advanced", url: "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=wm5gMKuwSYk" },
    { title: "Cybersecurity Fundamentals", provider: "Coursera", skill: "Security", difficulty: "Beginner", url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=inWWhr5tnEA" }
  ];
  
  for (const c of extraCourses) {
    await prisma.course.create({ data: c });
  }
  console.log("Added 5 extra courses!");
}

addMoreCourses().finally(() => prisma.$disconnect());
