import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const cors = require('cors');

// Setup basic configurations
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-hackathon';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy' });

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to validate user ID strings
function isValidObjectId(id: any): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}

// Reusable user include to ensure consistent data structure across endpoints
const userInclude = {
  skills: true,
  resumes: true,
  projects: true,
  roadmaps: { include: { tasks: true } },
  interviews: true,
  progress: true
};

// ---------------------------------------------------------
// Auth Endpoints
// ---------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      include: userInclude
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (error: any) {
    console.error("Registration error:", error);
    const isConnError = error?.message?.includes("Server selection timeout") || error?.code === "P2010";
    const msg = isConnError
      ? "Cannot connect to MongoDB. Please check DATABASE_URL in backend/.env or start your MongoDB service."
      : "Registration failed due to an internal error.";
    res.status(500).json({ error: msg });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: userInclude
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (error: any) {
    console.error("Login error:", error);
    const isConnError = error?.message?.includes("Server selection timeout") || error?.code === "P2010";
    const msg = isConnError
      ? "Cannot connect to MongoDB. Please check DATABASE_URL in backend/.env or start your MongoDB service."
      : "Login failed due to an internal error.";
    res.status(500).json({ error: msg });
  }
});

// ---------------------------------------------------------
// Onboarding & Profile Endpoints
// ---------------------------------------------------------

app.post('/api/onboarding', async (req, res) => {
  const { userId, career_goal, college, graduation_year } = req.body;
  if (!userId || !isValidObjectId(userId)) {
    return res.status(400).json({ error: "Invalid or missing userId" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        career_goal,
        college,
        graduation_year: graduation_year ? parseInt(graduation_year, 10) : null,
      },
      include: userInclude
    });
    res.json(user);
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

app.post('/api/resume/upload', upload.single('resume'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file || !userId || !isValidObjectId(userId)) {
      return res.status(400).json({ error: "Missing file or valid userId" });
    }

    // Verify user exists first
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    await parser.destroy();
    const text = data.text;

    // AI Extraction
    let skillsJson = [];
    try {
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ 
            role: "system", 
            content: "You are an AI that extracts skills from a resume. Return ONLY a JSON array of objects with properties 'skill_name' (string), 'category' (Technical/Soft), 'level' (Beginner/Intermediate/Advanced)." 
          }, { 
            role: "user", 
            content: text.substring(0, 3000) 
          }],
        });
        skillsJson = JSON.parse(response.choices[0].message.content || '[]');
      } else {
        // Fallback for demo
        skillsJson = [
          { skill_name: "Python", category: "Technical", level: "Intermediate" },
          { skill_name: "React", category: "Technical", level: "Advanced" },
          { skill_name: "Teamwork", category: "Soft", level: "Advanced" }
        ];
      }
    } catch (aiError) {
      console.error("AI Skill Extraction Error:", aiError);
      skillsJson = [
        { skill_name: "Python", category: "Technical", level: "Intermediate" },
        { skill_name: "Communication", category: "Soft", level: "Advanced" }
      ];
    }

    // Save Resume to DB
    await prisma.resume.create({
      data: { 
        user_id: userId, 
        extracted_text: text, 
        file_url: req.file.filename, 
        resume_score: Math.floor(Math.random() * 20) + 75 // Mock score 75-95
      }
    });

    // Save Skills to DB
    for (const s of skillsJson) {
      // Check if skill already exists for this user to avoid duplicates
      const existingSkill = await prisma.skill.findFirst({
        where: { user_id: userId, skill_name: s.skill_name }
      });

      if (!existingSkill) {
        await prisma.skill.create({
          data: { 
            user_id: userId, 
            skill_name: s.skill_name, 
            category: s.category || 'Technical', 
            level: s.level || 'Beginner', 
            source: 'resume', 
            score: s.level === 'Advanced' ? 90 : s.level === 'Intermediate' ? 60 : 30 
          }
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Resume upload error:", error);
    res.status(500).json({ error: "Resume processing failed." });
  }
});

app.post('/api/skills', async (req, res) => {
  const { userId, skill_name, category, level } = req.body;
  if (!userId || !skill_name) {
    return res.status(400).json({ error: "Missing userId or skill_name" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingSkill = await prisma.skill.findFirst({
      where: { user_id: userId, skill_name: skill_name }
    });

    if (existingSkill) {
      return res.status(400).json({ error: "Skill already exists for this user" });
    }

    let score = 30;
    if (level === 'Intermediate') score = 60;
    if (level === 'Advanced') score = 90;

    await prisma.skill.create({
      data: {
        user_id: userId,
        skill_name,
        category: category || 'Technical',
        level: level || 'Beginner',
        source: 'manual',
        score
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    res.status(201).json(updatedUser);
  } catch (error) {
    console.error("Add skill error:", error);
    res.status(500).json({ error: "Failed to add skill." });
  }
});

app.post('/api/roadmap/generate', async (req, res) => {
  const { userId, targetRole } = req.body;
  if (!userId || !isValidObjectId(userId) || !targetRole) {
    return res.status(400).json({ error: "Missing or invalid userId or targetRole" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { skills: true } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const skillsContext = user.skills.map(s => `${s.skill_name} (${s.level})`).join(', ');

    let roadmapJson: any = {};
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "You are an AI career mentor. Return a JSON object with a single property 'tasks' which is an array of objects representing a learning roadmap. Each task must have 'title' (string), 'description' (string), 'duration' (string like '3 weeks'), 'type' (course/project/cert/interview)."
          }, {
            role: "user",
            content: `Target Role: ${targetRole}\nCurrent Skills: ${skillsContext}`
          }],
        });
        roadmapJson = JSON.parse(response.choices[0].message.content || '{"tasks":[]}');
      } catch (e) {
        console.error("AI Roadmap Error:", e);
        roadmapJson = null;
      }
    }
    
    if (!roadmapJson || !roadmapJson.tasks) {
      // Fallback
      roadmapJson = {
        tasks: [
          { title: `Foundations of ${targetRole}`, description: "Understand the core concepts and tools.", duration: "2 weeks", type: "course" },
          { title: "Build a Portfolio Project", description: "Apply your skills in a practical scenario.", duration: "4 weeks", type: "project" },
          { title: "Mock Interview Preparation", description: "Practice behavioral and technical questions.", duration: "1 week", type: "interview" }
        ]
      };
    }

    // Delete existing roadmap and tasks if generating a new one
    await prisma.roadmapTask.deleteMany({
      where: { roadmap: { user_id: userId } }
    });
    await prisma.roadmap.deleteMany({
      where: { user_id: userId }
    });

    const roadmap = await prisma.roadmap.create({
      data: { user_id: userId, target_role: targetRole, phasesJson: JSON.stringify(roadmapJson) }
    });

    for (const t of roadmapJson.tasks || []) {
      await prisma.roadmapTask.create({
        data: { 
          roadmap_id: roadmap.id, 
          title: t.title, 
          description: t.description || '', 
          duration: t.duration || '1 week', 
          type: t.type || 'course', 
          status: "Pending" 
        }
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Roadmap generation error:", error);
    res.status(500).json({ error: "Roadmap generation failed." });
  }
});

app.put('/api/roadmap/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { status, userId } = req.body;
  if (!userId || !status) {
    return res.status(400).json({ error: "Missing userId or status" });
  }

  try {
    const task = await prisma.roadmapTask.update({
      where: { id: taskId },
      data: { status }
    });

    // Recalculate roadmap progress
    const roadmapId = task.roadmap_id;
    const allTasks = await prisma.roadmapTask.findMany({
      where: { roadmap_id: roadmapId }
    });
    
    const completed = allTasks.filter(t => t.status === 'Completed').length;
    const progress = Math.round((completed / allTasks.length) * 100);

    await prisma.roadmap.update({
      where: { id: roadmapId },
      data: { progress }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Task update error:", error);
    res.status(500).json({ error: "Failed to update task." });
  }
});

// ---------------------------------------------------------
// Dashboard Features Endpoints
// ---------------------------------------------------------

app.post('/api/projects', async (req, res) => {
  const { userId, title, description, technologies, type } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: "Missing userId or title" });
  }

  try {
    await prisma.project.create({
      data: {
        user_id: userId,
        title,
        description: description || '',
        technologies: technologies || '',
        status: 'To Do',
        progress: 0
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    res.status(201).json(updatedUser);
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ error: "Failed to create project." });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { userId, status, progress } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    await prisma.project.update({
      where: { id },
      data: { status, progress }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ error: "Failed to update project." });
  }
});

app.get('/api/recommendations', async (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string' || !isValidObjectId(userId)) {
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { skills: true } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let recommendations = [];
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "Return a JSON array of 3 recommended courses or projects for a user based on their skills. Each object should have 'title', 'type' (course/project), 'difficulty', and 'justification'."
          }, {
            role: "user",
            content: `Skills: ${user.skills.map(s => s.skill_name).join(', ')}`
          }],
        });
        recommendations = JSON.parse(response.choices[0].message.content || '[]');
      } catch (e) {
        console.error("AI Recommendation Error:", e);
      }
    }

    // Fallback
    if (recommendations.length === 0) {
      recommendations = [
        { title: 'Mastering System Design', type: 'course', difficulty: 'Advanced', justification: 'Essential for senior roles.' },
        { title: 'Fullstack AI Application', type: 'project', difficulty: 'Intermediate', justification: 'Great way to combine frontend and backend skills.' },
        { title: 'Advanced Data Structures', type: 'course', difficulty: 'Intermediate', justification: 'Crucial for technical interviews.' }
      ];
    }

    res.json(recommendations);
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({ error: "Failed to fetch recommendations." });
  }
});

app.get('/api/courses/recommended', async (req, res) => {
  try {
    // Seed dummy courses if none exist
    const count = await prisma.course.count();
    if (count === 0) {
      const dummyCourses = [
        { title: "Advanced React Patterns", provider: "FrontendMasters", skill: "React", difficulty: "Advanced", url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=17m0Iev3Pzw" },
        { title: "Complete SQL Bootcamp", provider: "Udemy", skill: "SQL", difficulty: "Beginner", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=HXV3zeQKqGY" },
        { title: "System Design for Interviews", provider: "AlgoExpert", skill: "System Design", difficulty: "Advanced", url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=bBTPHL9NwM8" },
        { title: "Machine Learning A-Z", provider: "Coursera", skill: "Machine Learning", difficulty: "Intermediate", url: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=GwIo3gDZCVQ" },
        { title: "Node.js Microservices", provider: "Udemy", skill: "Node.js", difficulty: "Intermediate", url: "https://images.unsplash.com/photo-1627398225058-f4c07920ab4b?q=80&w=600&auto=format&fit=crop", videoUrl: "https://www.youtube.com/watch?v=1vZOEGNaAA8" }
      ];
      for (const c of dummyCourses) {
        await prisma.course.create({ data: c });
      }
    }

    const { userId } = req.query;
    let courses = await prisma.course.findMany();

    if (userId && typeof userId === 'string' && isValidObjectId(userId)) {
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { skills: true } });
      if (user) {
        const userSkillsMap = new Map<string, number>();
        user.skills.forEach(s => userSkillsMap.set(s.skill_name.toLowerCase(), s.score ?? 50));

        const enrichedCourses = courses.map(c => {
          const lowerSkill = c.skill.toLowerCase();
          const isMatch = userSkillsMap.has(lowerSkill);
          const score = isMatch ? userSkillsMap.get(lowerSkill)! : null;
          const isGap = isMatch && (score === null || score < 50);
          return {
            ...c,
            isUserSkillMatch: isMatch,
            userSkillScore: score,
            isSkillGap: isGap
          };
        });

        // Sort: Skill gaps first, then matching skills, then others
        enrichedCourses.sort((a, b) => {
          if (a.isSkillGap && !b.isSkillGap) return -1;
          if (!a.isSkillGap && b.isSkillGap) return 1;
          if (a.isUserSkillMatch && !b.isUserSkillMatch) return -1;
          if (!a.isUserSkillMatch && b.isUserSkillMatch) return 1;
          return 0;
        });

        return res.json(enrichedCourses);
      }
    }

    res.json(courses);
  } catch (error) {
    console.error("Courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses." });
  }
});

app.get('/api/interview/prep', async (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string' || !isValidObjectId(userId)) {
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let questions = [];
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "Return a JSON array of 3 interview questions for a user. Each object: 'question' (string), 'category' (string), 'difficulty' (string), 'answer' (string)."
          }, {
            role: "user",
            content: `Role: ${user.career_goal || 'Software Engineer'}`
          }],
        });
        questions = JSON.parse(response.choices[0].message.content || '[]');
      } catch (e) {
        console.error("AI Interview Prep Error:", e);
      }
    }

    if (questions.length === 0) {
      questions = [
        { category: 'General', difficulty: 'Medium', question: 'Describe a challenging project you worked on.', answer: 'Use the STAR method: Situation, Task, Action, Result.' },
        { category: 'Technical', difficulty: 'Medium', question: 'How do you handle state management in a large application?', answer: 'Discuss tools like Redux, Zustand, or Context API, and the trade-offs of each.' },
        { category: 'System Design', difficulty: 'Hard', question: 'How would you scale a web application to handle 1 million users?', answer: 'Discuss load balancing, caching, database indexing, and horizontal scaling.' }
      ];
    }

    res.json(questions);
  } catch (error) {
    console.error("Interview prep error:", error);
    res.status(500).json({ error: "Failed to fetch interview questions." });
  }
});

app.post('/api/interview/record', async (req, res) => {
  const { userId, type, score } = req.body;
  if (!userId || !type || score === undefined) {
    return res.status(400).json({ error: "Missing userId, type, or score" });
  }

  try {
    await prisma.interview.create({
      data: {
        user_id: userId,
        type,
        score
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude
    });

    res.status(201).json(updatedUser);
  } catch (error) {
    console.error("Record interview error:", error);
    res.status(500).json({ error: "Failed to record interview." });
  }
});

app.post('/api/chat', async (req, res) => {
  const { userId, message, page } = req.body;
  if (!userId || !isValidObjectId(userId)) {
    return res.status(400).json({ error: "Invalid or missing userId" });
  }
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        projects: true,
        roadmaps: { include: { tasks: true } },
        interviews: true
      }
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
      try {
        const activeRoadmap = user.roadmaps[0];
        const roadmapContext = activeRoadmap?.tasks
          ?.map(t => `${t.title} [${t.status}]`)
          .join('; ') || 'No roadmap generated yet';
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: `You are an AI career mentor for ${user.name}. Target role: ${user.career_goal || 'not set'}. Current skills: ${user.skills.map(s=>`${s.skill_name} (${s.level})`).join(', ') || 'none yet'}. Roadmap: ${roadmapContext}. Current app page: ${page || 'unknown'}. Give concise, practical advice with 2-4 bullet points and one immediate next action.`
          }, {
            role: "user",
            content: message
          }],
        });
        return res.json({ message: response.choices[0].message.content });
      } catch (e) {
        console.error("AI Chat Error:", e);
      }
    }

    // Fallback response based on keywords
    const activeRoadmap = user.roadmaps[0];
    const nextTask = activeRoadmap?.tasks.find(t => t.status !== 'Completed');
    const weakestSkill = [...user.skills].sort((a, b) => (a.score || 50) - (b.score || 50))[0];
    let response = "I'm running in offline mentor mode. Generate your roadmap, add your skills, and I can still guide your next action from your saved profile.";
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('next') || lowerMessage.includes('roadmap') || lowerMessage.includes('what should')) {
      response = nextTask
        ? `Your next roadmap move is: ${nextTask.title}. Spend ${nextTask.duration || 'a focused session'} on it, then mark it complete so your progress updates.`
        : `You do not have an active roadmap yet. Go to Career Roadmap, enter your target role, and generate a plan first.`;
    } else if (lowerMessage.includes('skill') || lowerMessage.includes('improve')) {
      response = weakestSkill
        ? `Improve ${weakestSkill.skill_name} first. It is currently your lowest scored skill, so one course plus one small project will raise your readiness fastest.`
        : `Add your current skills in My Skills first. Once I can see your skill list, I can tell you what to improve next.`;
    } else if (lowerMessage.includes('7 day') || lowerMessage.includes('week') || lowerMessage.includes('study plan')) {
      response = nextTask
        ? `7 day plan: Days 1-2 learn the basics for "${nextTask.title}", Days 3-4 practice with exercises, Days 5-6 build a small proof project, Day 7 revise and mark the roadmap task complete.`
        : `7 day plan: Day 1 set your target role, Day 2 add skills, Day 3 upload resume, Day 4 generate roadmap, Days 5-6 complete the first task, Day 7 do one mock interview.`;
    } else if (lowerMessage.includes('react') || lowerMessage.includes('frontend')) {
      response = "Frontend development is crucial! Make sure you understand state management and component lifecycles deeply.";
    } else if (lowerMessage.includes('backend') || lowerMessage.includes('node') || lowerMessage.includes('python')) {
      response = "For backend roles, focus on building robust APIs, understanding databases (SQL/NoSQL), and system design principles.";
    } else if (lowerMessage.includes('interview')) {
      response = "To prepare for interviews, practice coding problems, and use the STAR method for behavioral questions.";
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = `Hello ${user.name.split(' ')[0]}! What are we focusing on today?`;
    } else if (lowerMessage.includes('dsa') || lowerMessage.includes('dssa') || lowerMessage.includes('algorithm') || lowerMessage.includes('data structure')) {
      response = "Data Structures and Algorithms (DSA) are foundational. Start with basic arrays and strings, then move to trees, graphs, and dynamic programming.";
    }
    
    res.json({ message: response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process chat message." });
  }
});

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
