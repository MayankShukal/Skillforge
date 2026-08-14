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

async function callGemini(systemInstruction: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'dummy' || apiKey.trim() === '') return null;

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ]
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        console.error(`Gemini API error (${model}):`, res.status, errText);
      }
    } catch (err) {
      console.error(`Failed to call Gemini API (${model}):`, err);
    }
  }

  return null;
}


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

app.get('/', (req, res) => {
  res.send('Skillforge Backend Server is Running Live!');
});

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
  console.log("--> Received Register request:", { name, email });
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields (name, email, or password)" });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const rawEmail = email.trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: rawEmail }
        ]
      }
    });

    if (existingUser) {
      console.log("--> Register failed: User already exists:", cleanEmail);
      return res.status(400).json({ error: "User already exists with this email address. Please sign in instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: cleanEmail, passwordHash },
      include: userInclude
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log("--> Register successful for:", cleanEmail);
    res.status(201).json({ user, token });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed due to an internal server error." });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("--> Received Login request for email:", email);
  if (!email || !password) {
    return res.status(400).json({ error: "Missing required email or password fields." });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const rawEmail = email.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: rawEmail }
        ]
      },
      include: userInclude
    });

    if (!user || !user.passwordHash) {
      console.log("--> Login failed: User not found for email:", cleanEmail);
      return res.status(401).json({ error: "No account found with this email address. Please create an account." });
    }

    let isValid = false;
    const isBcrypt = user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$') || user.passwordHash.startsWith('$2y$');

    if (isBcrypt) {
      isValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Handle legacy unhashed or seeded passwords
      if (password === user.passwordHash) {
        isValid = true;
        // Auto-upgrade legacy password to bcrypt hash
        try {
          const newHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash }
          });
        } catch (e) {
          console.error("Failed to upgrade legacy password hash", e);
        }
      }
    }

    if (!isValid) {
      console.log("--> Login failed: Incorrect password for email:", cleanEmail);
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log("--> Login successful for email:", cleanEmail);
    res.json({ user, token });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed due to an internal server error." });
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

app.put('/api/user/:id', async (req, res) => {
  const { id } = req.params;
  const { name, career_goal, college, degree, branch, graduation_year } = req.body;
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        career_goal: career_goal !== undefined ? career_goal : undefined,
        college: college !== undefined ? college : undefined,
        degree: degree !== undefined ? degree : undefined,
        branch: branch !== undefined ? branch : undefined,
        graduation_year: graduation_year !== undefined ? (graduation_year ? parseInt(graduation_year, 10) : null) : undefined,
      },
      include: userInclude
    });
    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
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
    const text = data.text || '';

    // AI Extraction
    let skillsJson: any[] = [];
    try {
      let rawAiText: string | null = null;
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
        rawAiText = response.choices[0]?.message?.content || null;
      } else if (process.env.GEMINI_API_KEY) {
        rawAiText = await callGemini(
          "You are an AI that extracts skills from a resume. Return ONLY a JSON array of objects with properties 'skill_name' (string), 'category' (Technical/Soft), 'level' (Beginner/Intermediate/Advanced).",
          "Extract skills from this text:\n" + text.substring(0, 3000)
        );
      }

      if (rawAiText) {
        const cleaned = rawAiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          skillsJson = parsed;
        }
      }
    } catch (aiError) {
      console.error("AI Skill Extraction Error:", aiError);
    }

    if (!skillsJson || skillsJson.length === 0) {
      const commonSkills = [
        { name: 'JavaScript', category: 'Technical' },
        { name: 'TypeScript', category: 'Technical' },
        { name: 'Python', category: 'Technical' },
        { name: 'React', category: 'Technical' },
        { name: 'Node.js', category: 'Technical' },
        { name: 'SQL', category: 'Technical' },
        { name: 'Git', category: 'Technical' },
        { name: 'Docker', category: 'Technical' },
        { name: 'Communication', category: 'Soft' },
        { name: 'Team Leadership', category: 'Soft' }
      ];
      const textUpper = text.toUpperCase();
      skillsJson = commonSkills
        .filter(s => textUpper.includes(s.name.toUpperCase()))
        .map(s => ({ skill_name: s.name, category: s.category, level: 'Intermediate' }));

      if (skillsJson.length === 0) {
        skillsJson = [
          { skill_name: "Software Engineering", category: "Technical", level: "Intermediate" },
          { skill_name: "Problem Solving", category: "Soft", level: "Advanced" }
        ];
      }
    }

    // Save Resume to DB
    await prisma.resume.create({
      data: { 
        user_id: userId, 
        extracted_text: text.substring(0, 5000), 
        file_url: req.file.filename, 
        resume_score: Math.floor(Math.random() * 20) + 75
      }
    });

    // Save clean Skills to DB
    for (const s of skillsJson) {
      let rawName = typeof s === 'string' ? s : (s.skill_name || s.name || '');
      rawName = rawName.replace(/[{}"'`]/g, '').trim();
      if (!rawName || rawName.length > 40 || rawName.toLowerCase().includes('json')) continue;

      const existingSkill = await prisma.skill.findFirst({
        where: { user_id: userId, skill_name: rawName }
      });

      if (!existingSkill) {
        await prisma.skill.create({
          data: { 
            user_id: userId, 
            skill_name: rawName, 
            category: s.category === 'Soft' ? 'Soft' : 'Technical', 
            level: s.level || 'Intermediate', 
            source: 'resume', 
            score: s.level === 'Advanced' ? 90 : s.level === 'Intermediate' ? 60 : 40
          }
        });
      }
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

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

app.delete('/api/resume/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resume = await prisma.resume.findUnique({ where: { id } });
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    await prisma.skill.deleteMany({
      where: { user_id: resume.user_id, source: 'resume' }
    });

    await prisma.resume.delete({ where: { id } });

    const updatedUser = await prisma.user.findUnique({
      where: { id: resume.user_id },
      include: userInclude
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Delete resume error:", error);
    res.status(500).json({ error: "Failed to delete resume." });
  }
});

app.post('/api/skills', async (req, res) => {
  const { userId, skill_name, category, level } = req.body;
  if (!userId || !skill_name) {
    return res.status(400).json({ error: "Missing userId or skill_name" });
  }

  const cleanName = skill_name.replace(/[{}"'`]/g, '').trim();

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingSkill = await prisma.skill.findFirst({
      where: { user_id: userId, skill_name: cleanName }
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
        skill_name: cleanName,
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

app.delete('/api/skills/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) return res.status(404).json({ error: "Skill not found" });

    await prisma.skill.delete({ where: { id } });

    const updatedUser = await prisma.user.findUnique({
      where: { id: skill.user_id },
      include: userInclude
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Delete skill error:", error);
    res.status(500).json({ error: "Failed to delete skill." });
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

function generateDynamicMentorResponse(user: any, message: string, page?: string): string {
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const role = user.career_goal || 'Software Engineer';
  const skillsList = user.skills?.map((s: any) => s.skill_name).join(', ') || 'general core skills';
  const activeRoadmap = user.roadmaps?.[0];
  const nextTask = activeRoadmap?.tasks?.find((t: any) => t.status !== 'Completed');
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|greetings|good morning|good evening)/i.test(lower)) {
    return `Hello ${firstName}! I'm your AI Career Mentor. I see your target role is ${role}. How can I assist your prep today? You can ask me for study recommendations, project ideas, or interview prep advice.`;
  }

  // Next steps / Roadmap questions
  if (lower.includes('next') || lower.includes('roadmap') || lower.includes('what should i do') || lower.includes('what to study')) {
    if (nextTask) {
      return `Based on your ${role} roadmap, here is your immediate focus:\n• **Current Task:** ${nextTask.title}\n• **Description:** ${nextTask.description}\n• **Estimated Time:** ${nextTask.duration}\n\n👉 **Action Step:** Work on this task for your next study session and mark it complete on your Career Roadmap tab.`;
    }
    return `You're targeting **${role}**. Here is your recommended path:\n1. Head over to the **Career Roadmap** tab to generate your custom step-by-step roadmap.\n2. Ensure your top skills (${skillsList}) are up to date under **My Skills**.\n3. Start with a core foundational project!`;
  }

  // Skills / Improvement
  if (lower.includes('skill') || lower.includes('improve') || lower.includes('gap') || lower.includes('weak')) {
    const sorted = [...(user.skills || [])].sort((a: any, b: any) => (a.score || 50) - (b.score || 50));
    const weakest = sorted[0];
    if (weakest) {
      return `Analyzing your profile for **${role}**:\n• **Key Focus Area:** ${weakest.skill_name} (${weakest.level || 'Beginner'})\n• **Recommendation:** Spend 3-4 days building a mini-project that specifically utilizes ${weakest.skill_name}.\n• **Next Action:** Check out recommended courses in the **Courses** tab tailored to ${weakest.skill_name}.`;
    }
    return `To boost your career readiness score for **${role}**:\n• Add your technical skills in **My Skills**.\n• Upload your resume in **Resume Analysis** to automatically extract verified skills.`;
  }

  // Interview preparation
  if (lower.includes('interview') || lower.includes('prepare') || lower.includes('mock') || lower.includes('question')) {
    return `Here is your quick Interview Prep strategy for **${role}**:\n• **Technical:** Practice core algorithms and practical architecture scenarios.\n• **Behavioral:** Prepare 3 STAR-format stories (Situation, Task, Action, Result) highlighting problem solving.\n• **Action Item:** Jump into the **Interview Prep** tab on the left sidebar to practice mock interview questions.`;
  }

  // Resume guidance
  if (lower.includes('resume') || lower.includes('cv') || lower.includes('project')) {
    return `To make your resume stand out for **${role}** positions:\n• Highlight hands-on projects with measurable outcomes (e.g. 'Improved speed by 40%').\n• Include key technologies: ${skillsList}.\n• **Action Step:** Upload your latest PDF resume under **Resume Analysis** for an instant ATS breakdown and score!`;
  }

  // Specific domain / topic questions
  if (lower.includes('react') || lower.includes('frontend') || lower.includes('ui') || lower.includes('css')) {
    return `For Frontend & React mastery targeting **${role}**:\n• Focus on component lifecycle, custom hooks, and state management (Zustand/Redux).\n• Build responsive UI layouts with TailwindCSS.\n• Practice building real API-driven web applications.`;
  }

  if (lower.includes('backend') || lower.includes('node') || lower.includes('express') || lower.includes('database') || lower.includes('sql') || lower.includes('api')) {
    return `For Backend development targeting **${role}**:\n• Master RESTful API design, middleware, and request validation.\n• Gain strong database hands-on practice (Prisma ORM with SQLite/PostgreSQL/MongoDB).\n• Learn authentication patterns (JWT, bcrypt, session cookies).`;
  }

  if (lower.includes('python') || lower.includes('ai') || lower.includes('ml') || lower.includes('data')) {
    return `For AI/Data Engineering targeting **${role}**:\n• Master Python fundamentals, Pandas, and NumPy for data manipulation.\n• Learn how to integrate LLM APIs and prompt engineering into applications.\n• Build an end-to-end data pipeline or AI assistant application.`;
  }

  // Generic intelligent response tailored to user query
  return `Great question regarding "${message}"! As your AI Career Mentor for **${role}**:\n\n• **Advice:** Align your study directly with practical building. Theory plus hands-on execution is the fastest way to placement readiness.\n• **Current Status:** You have ${user.skills?.length || 0} active skills listed and ${user.projects?.length || 0} projects in progress.\n• **Next Step:** ${nextTask ? `Focus on completing '${nextTask.title}'` : 'Generate your target role roadmap in the Career Roadmap tab'}. Let me know if you need specific learning resources!`;
}

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

    const activeRoadmap = user.roadmaps[0];
    const roadmapContext = activeRoadmap?.tasks
      ?.map(t => `${t.title} [${t.status}]`)
      .join('; ') || 'No roadmap generated yet';
    const systemPrompt = `You are an AI career mentor for ${user.name}. Target role: ${user.career_goal || 'not set'}. Current skills: ${user.skills.map(s=>`${s.skill_name} (${s.level})`).join(', ') || 'none yet'}. Roadmap: ${roadmapContext}. Current app page: ${page || 'unknown'}. Give concise, practical advice with 2-4 bullet points and one immediate next action.`;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        const geminiReply = await callGemini(systemPrompt, message);
        if (geminiReply) {
          return res.json({ message: geminiReply });
        }
      } catch (e) {
        console.error("Gemini AI Chat Error:", e);
      }
    }

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: systemPrompt
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

    // Fallback dynamic AI mentor generator if API key is not present or API call fails
    const response = generateDynamicMentorResponse(user, message, page);
    return res.json({ message: response });
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
