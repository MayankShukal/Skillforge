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

async function updateUserStreak(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { resumes: true }
    });
    if (!user) return 0;

    // Reset streak if user has no resumes uploaded
    if (!user.resumes || user.resumes.length === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { streak: 0 }
      });
      return 0;
    }

    const today = new Date().toISOString().split('T')[0];
    if (user.lastActiveDate === today) {
      return user.streak > 0 ? user.streak : 1;
    }

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    let newStreak = 1;
    if (user.lastActiveDate === yesterday) {
      newStreak = (user.streak || 0) + 1;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { streak: newStreak, lastActiveDate: today }
    });

    return newStreak;
  } catch (err) {
    console.error("Error updating streak:", err);
    return 0;
  }
}

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

    // Update streak for active user
    await updateUserStreak(userId);

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

    const remainingResumesCount = await prisma.resume.count({
      where: { user_id: resume.user_id }
    });

    if (remainingResumesCount === 0) {
      // If no resumes remain, wipe all skills, progress, and reset streak to 0
      await prisma.skill.deleteMany({
        where: { user_id: resume.user_id }
      });
      await prisma.progress.deleteMany({
        where: { user_id: resume.user_id }
      });
      await prisma.user.update({
        where: { id: resume.user_id },
        data: { streak: 0 }
      });
    }

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

    const systemPrompt = `You are Gemini AI Career Architect for ${targetRole} positions. Generate a comprehensive, step-by-step career learning roadmap for a candidate aiming to become a ${targetRole}. Candidate Current Skills: [${skillsContext || 'General Technical Fundamentals'}].

Return ONLY a JSON object with property 'tasks' (array of 5 to 6 structured sequential steps).
Each task object MUST have:
- 'title': (string concise title)
- 'description': (string detailed actionable description with topics and key deliverables)
- 'duration': (string e.g. '2 weeks')
- 'type': ('course' or 'project' or 'cert' or 'interview')
- 'milestone': (string e.g. 'Phase 1: Core Fundamentals', 'Phase 2: Advanced Architecture', 'Phase 3: Real-World Portfolio', 'Phase 4: Interview & Placement Mastery')`;

    const userPrompt = `Generate a career roadmap to achieve the target role: ${targetRole}. Candidate skills: ${skillsContext || 'None'}`;

    let roadmapJson: any = {};

    try {
      let rawText: string | null = null;
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY.trim() !== '') {
        rawText = await callGemini(systemPrompt, userPrompt);
      } else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
        });
        rawText = response.choices[0]?.message?.content || null;
      }

      if (rawText) {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        roadmapJson = JSON.parse(cleaned);
      }
    } catch (e) {
      console.error("Gemini AI Roadmap Error:", e);
      roadmapJson = null;
    }

    if (!roadmapJson || !Array.isArray(roadmapJson.tasks) || roadmapJson.tasks.length === 0) {
      roadmapJson = {
        tasks: [
          { title: `Phase 1: Core ${targetRole} Fundamentals`, description: `Master essential programming languages, data structures, and core frameworks for ${targetRole}.`, duration: "2 weeks", type: "course", milestone: "Phase 1: Foundations" },
          { title: `Phase 2: System Architecture & API Design`, description: `Learn production database design, REST/GraphQL APIs, authentication, and state management.`, duration: "3 weeks", type: "course", milestone: "Phase 2: Architecture" },
          { title: `Phase 3: Build End-to-End Production ${targetRole} Project`, description: `Architect and deploy a full-stack portfolio application with real database, CI/CD, and unit tests.`, duration: "4 weeks", type: "project", milestone: "Phase 3: Portfolio" },
          { title: `Phase 4: ${targetRole} Technical & System Design Mock Prep`, description: `Practice mock coding challenges, system design diagrams, and behavioral STAR interviews.`, duration: "2 weeks", type: "interview", milestone: "Phase 4: Interview Mastery" }
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

    // Update streak for active user task completion
    await updateUserStreak(userId);

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

    const role = user.career_goal || 'Software Engineer';
    const skillsList = user.skills.map(s => s.skill_name).join(', ');
    const systemPrompt = "Return ONLY a JSON array of 3 specific recommendations for a candidate. Each object has properties: 'title' (string), 'type' ('course' or 'project'), 'difficulty' ('Beginner' or 'Intermediate' or 'Advanced'), and 'justification' (string why it boosts their career).";
    const userPrompt = `Target Role: ${role}. Current Skills: ${skillsList || 'General Programming'}`;

    let recommendations = [];
    try {
      let rawAiText: string | null = null;
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
        });
        rawAiText = response.choices[0]?.message?.content || null;
      } else if (process.env.GEMINI_API_KEY) {
        rawAiText = await callGemini(systemPrompt, userPrompt);
      }

      if (rawAiText) {
        const cleaned = rawAiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          recommendations = parsed;
        }
      }
    } catch (e) {
      console.error("AI Recommendation Error:", e);
    }

    const defaultVideos = [
      "https://www.youtube.com/watch?v=17m0Iev3Pzw",
      "https://www.youtube.com/watch?v=HXV3zeQKqGY",
      "https://www.youtube.com/watch?v=bBTPHL9NwM8"
    ];

    if (recommendations.length === 0) {
      recommendations = [
        { title: `Building Scalable ${role} Applications`, type: 'course', difficulty: 'Advanced', justification: `Targets core architecture skills needed for ${role} positions.`, videoUrl: defaultVideos[0] },
        { title: `Full-Stack ${role} Portfolio Project`, type: 'project', difficulty: 'Intermediate', justification: `Demonstrates real-world implementation capabilities with ${skillsList || 'modern frameworks'}.`, videoUrl: defaultVideos[1] },
        { title: `System Design & Performance Optimization`, type: 'course', difficulty: 'Intermediate', justification: 'Crucial for technical interviews and senior development roles.', videoUrl: defaultVideos[2] }
      ];
    } else {
      recommendations = recommendations.map((rec: any, idx: number) => ({
        ...rec,
        videoUrl: rec.videoUrl || rec.url || defaultVideos[idx % defaultVideos.length]
      }));
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
  const { userId, difficulty, category, count } = req.query;
  if (!userId || typeof userId !== 'string' || !isValidObjectId(userId)) {
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { skills: true } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const role = user.career_goal || 'Software Engineer';
    const skillsList = user.skills.map(s => s.skill_name).join(', ');

    const targetDiff = (typeof difficulty === 'string' && ['Easy', 'Medium', 'Hard'].includes(difficulty)) ? difficulty : 'Any';
    const targetCat = (typeof category === 'string' && ['Technical', 'Behavioral', 'System Design'].includes(category)) ? category : 'Any';
    const reqCount = parseInt(typeof count === 'string' ? count : '6', 10) || 6;

    const systemPrompt = `You are an expert technical interviewer for ${role} roles. Return ONLY a JSON array of ${reqCount} realistic, high-quality interview questions tailored to target role '${role}' and skills [${skillsList || 'General Programming'}]. Filter parameters requested: Difficulty = ${targetDiff}, Category = ${targetCat}. Each object MUST have: 'question' (string), 'category' ('Technical' or 'Behavioral' or 'System Design'), 'difficulty' ('Easy' or 'Medium' or 'Hard'), 'answer' (detailed STAR format answer or technical explanation).`;
    const userPrompt = `Generate ${reqCount} unique interview prep questions. Target difficulty: ${targetDiff}, category: ${targetCat}. Candidate role: ${role}.`;

    let questions: any[] = [];
    try {
      let rawAiText: string | null = null;
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
        });
        rawAiText = response.choices[0]?.message?.content || null;
      } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY.trim() !== '') {
        rawAiText = await callGemini(systemPrompt, userPrompt);
      }

      if (rawAiText) {
        const cleaned = rawAiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          questions = parsed;
        }
      }
    } catch (e) {
      console.error("AI Interview Prep Error:", e);
    }

    if (questions.length === 0) {
      const pool = [
        { category: 'Technical', difficulty: 'Easy', question: `What are the core principles of state management when building ${role} applications with ${skillsList || 'modern JavaScript/TypeScript'}?`, answer: 'State management isolates application state from UI logic, ensuring predictable uni-directional data flow, reusability, and easier testing.' },
        { category: 'Technical', difficulty: 'Easy', question: `Explain how REST APIs handle request validation and status codes in ${role} backends.`, answer: 'REST APIs validate incoming payloads against schemas, returning 200/201 for success, 400 for bad input, 401/403 for auth issues, and 500 for internal errors.' },
        { category: 'Technical', difficulty: 'Medium', question: `How would you architect a scalable database schema and index strategy for a ${role} platform?`, answer: 'Design normalized schemas for integrity, index high-frequency query fields, utilize connection pooling, and implement read replicas for traffic spikes.' },
        { category: 'Technical', difficulty: 'Medium', question: `How do you handle asynchronous operations, error boundaries, and API rate limiting in modern production applications?`, answer: 'Use async/await with robust try/catch blocks, React error boundaries for UI fallback, and Redis-backed token bucket middleware for rate limiting.' },
        { category: 'Technical', difficulty: 'Hard', question: `How do you diagnose concurrency issues, memory leaks, and query latency in complex high-throughput systems?`, answer: 'Profile memory usage using heap snapshots, run database EXPLAIN ANALYZE on slow queries, implement distributed tracing (OpenTelemetry), and optimize event loops.' },
        { category: 'Technical', difficulty: 'Hard', question: `Architect a zero-downtime microservices deployment with database migrations for a ${role} system.`, answer: 'Use blue-green deployments, backward-compatible dual-write database migrations, circuit breakers, and automated canary rollbacks.' },
        { category: 'Behavioral', difficulty: 'Easy', question: `Tell me about a time you collaborated with cross-functional team members on a ${role} project.`, answer: 'S (Situation): Sprint deadline approaching. T (Task): Align frontend and backend contracts. A (Action): Created OpenAPI spec mock endpoints. R (Result): Features delivered 2 days early.' },
        { category: 'Behavioral', difficulty: 'Medium', question: 'Describe a situation where you had to prioritize competing technical demands under tight timelines.', answer: 'S: Major launch with 10 requested features. T: Scope management. A: Performed MoSCoW prioritization with PM, built core MVP features first. R: On-time release with 99.9% uptime.' },
        { category: 'Behavioral', difficulty: 'Hard', question: 'Share an instance where a production release introduced a critical bug. How did you lead the incident response?', answer: 'S: Outage post-deployment. T: Restore service immediately. A: Initiated incident bridge, rolled back deployment within 4 mins, conducted blameless post-mortem, added automated integration test. R: Zero data loss, robust prevention.' },
        { category: 'System Design', difficulty: 'Medium', question: `How would you design a real-time notification service for ${role} user events?`, answer: 'Use WebSockets or Server-Sent Events (SSE) backed by a Redis Pub/Sub message broker and scalable worker pool.' },
        { category: 'System Design', difficulty: 'Hard', question: `Design a global URL shortener with high availability, low latency, and 100,000 requests per second.`, answer: 'Utilize Base62 encoding, distributed ID generators (Snowflake), multi-tier Redis caching, and persistent database sharding.' }
      ];

      let filtered = pool;
      if (targetDiff !== 'Any') {
        filtered = filtered.filter(q => q.difficulty.toLowerCase() === targetDiff.toLowerCase());
      }
      if (targetCat !== 'Any') {
        filtered = filtered.filter(q => q.category.toLowerCase() === targetCat.toLowerCase());
      }

      if (filtered.length === 0) filtered = pool;

      // Shuffle or pick requested count
      questions = filtered.sort(() => 0.5 - Math.random()).slice(0, reqCount);
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

    // Update streak for active user mock interview completion
    await updateUserStreak(userId);

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

app.post('/api/interview/review', async (req, res) => {
  const { userId, question, answer, category, difficulty, mode } = req.body;
  if (!userId || !question) {
    return res.status(400).json({ error: "Missing required fields (userId, question)" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const role = user?.career_goal || 'Software Engineer';
    const lowerAns = (answer || '').toLowerCase().trim();

    const isDontKnowMode = mode === 'explain' || 
      lowerAns === '' || 
      lowerAns.includes("don't know") || 
      lowerAns.includes("dont know") || 
      lowerAns.includes("no idea") || 
      lowerAns.includes("not sure") || 
      lowerAns.includes("explain topic") ||
      lowerAns.includes("explain the topic");

    let evaluation = null;

    if (isDontKnowMode) {
      // Gemini Topic Explanation Mode
      const explainSystemPrompt = `You are Gemini AI Career Mentor & Interview Coach for ${role} positions. The candidate asked for an explanation of an interview topic. Return ONLY a JSON object with: 'isExplanation' (true), 'score' (0), 'summary' (detailed step-by-step explanation of the core technical concept, architecture, and real-world application), 'strengths' (array of 3 key takeaways/concepts to remember), 'improvements' (array of 3 action items on how to structure an ideal STAR answer for this topic).`;
      const explainUserPrompt = `Explain this ${category || 'Technical'} topic for a ${role} position:\nQuestion: ${question}`;

      try {
        let rawText: string | null = null;
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY.trim() !== '') {
          rawText = await callGemini(explainSystemPrompt, explainUserPrompt);
        } else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: explainSystemPrompt }, { role: "user", content: explainUserPrompt }]
          });
          rawText = response.choices[0]?.message?.content || null;
        }

        if (rawText) {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          evaluation = JSON.parse(cleaned);
        }
      } catch (e) {
        console.error("Gemini Explain Topic Error:", e);
      }

      if (!evaluation) {
        evaluation = {
          isExplanation: true,
          score: 0,
          summary: `### Concept Explanation for: "${question}"\n\n1. **Core Definition**: In ${role} development, this concept ensures system reliability, scalability, and modular software design.\n2. **How It Works**: Components/services handle requests asynchronously or via contracts, keeping concerns isolated.\n3. **Why Interviewers Ask**: Assesses your architectural depth, data flow understanding, and production readiness.`,
          strengths: [
            "Core concept isolation & modular component structure.",
            "Standard request validation and error boundary patterns.",
            "Asynchronous state handling & caching layers."
          ],
          improvements: [
            "Use Situation-Task-Action-Result (STAR) to structure your answer.",
            "Quantify impact (e.g. reduced latency by 35% or improved test coverage).",
            "Practice explaining trade-offs between speed, complexity, and maintainability."
          ]
        };
      }
    } else {
      // Answer Verification Mode with Gemini / OpenAI
      const verifySystemPrompt = `You are Gemini AI Interview Evaluator for ${role} candidates. 
Verify and evaluate the candidate's answer to the given question. 
Determine if the answer is CORRECT, PARTIALLY CORRECT, or INCORRECT/WRONG.
Return ONLY a JSON object with:
- 'score': (number 0-100)
- 'isWrong': (boolean: true if score < 60 or if the answer is incorrect/vague/wrong, false otherwise)
- 'verdict': (string: "❌ Your answer is incorrect / needs improvement" if wrong, or "✅ Correct Answer" if correct)
- 'summary': (string: If wrong, state clearly "❌ Your answer is incorrect." and then provide a thorough, step-by-step technical explanation of the topic so the user learns. If correct, provide positive feedback.)
- 'topicExplanation': (string: Comprehensive explanation of the topic, core architectural principles, and real-world application)
- 'strengths': (array of 2-3 specific technical strengths or positive takeaways)
- 'improvements': (array of 2-3 step-by-step tips showing the ideal STAR model answer structure for this topic)`;

      const verifyUserPrompt = `Candidate Target Role: ${role}\nQuestion (${category || 'Technical'} - ${difficulty || 'Medium'}): ${question}\nCandidate Answer: ${answer}`;

      try {
        let rawText: string | null = null;
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY.trim() !== '') {
          rawText = await callGemini(verifySystemPrompt, verifyUserPrompt);
        } else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: verifySystemPrompt }, { role: "user", content: verifyUserPrompt }]
          });
          rawText = response.choices[0]?.message?.content || null;
        }

        if (rawText) {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          evaluation = JSON.parse(cleaned);
        }
      } catch (e) {
        console.error("Gemini Interview Verification Error:", e);
      }

      if (!evaluation || typeof evaluation.score !== 'number') {
        const wordCount = (answer || '').trim().split(/\s+/).length;
        const lowerAnswerStr = (answer || '').toLowerCase();
        
        const isAnswerWrong = wordCount < 5 || 
          lowerAnswerStr.includes("wrong") || 
          lowerAnswerStr.includes("bad") || 
          lowerAnswerStr.includes("idk") ||
          lowerAnswerStr.includes("abc") ||
          lowerAnswerStr.includes("test");

        if (isAnswerWrong) {
          evaluation = {
            score: 35,
            isWrong: true,
            verdict: "❌ Your answer is incorrect / needs improvement",
            summary: `❌ Your answer is incorrect or too brief for a ${role} interview.\n\n### Topic Explanation for: "${question}"\n• **Core Concept**: To answer this question effectively for a ${role} position, you must explain the underlying data structures, component lifecycle, or API boundaries.\n• **Key Architecture**: Highlight how state flows through your system, input validation techniques, and error handling strategies.`,
            topicExplanation: `In ${role} interview evaluation, candidates are expected to demonstrate deep understanding of core system architecture, clean component boundaries, and quantitative performance impacts.`,
            strengths: [
              "Attempted the mock question.",
              "Identified the topic category."
            ],
            improvements: [
              "Structure your answer using Situation, Task, Action, Result (STAR).",
              "Provide a concrete code example or system architecture diagram scenario.",
              "Include quantitative metrics (e.g., reduced API latency by 40%)."
            ]
          };
        } else {
          let calculatedScore = Math.min(96, Math.max(72, 65 + wordCount * 2));
          evaluation = {
            score: calculatedScore,
            isWrong: false,
            verdict: "✅ Correct Answer & Strong Reasoning",
            summary: `Gemini Verification: Strong response! You effectively covered key technical fundamentals for ${role}, with clean architectural principles.`,
            topicExplanation: `Understanding ${category || 'Technical'} fundamentals is essential for senior technical interviews.`,
            strengths: [
              "Clear technical vocabulary and component isolation logic.",
              "Addressed key requirements outlined in the question."
            ],
            improvements: [
              "Incorporate concrete quantitative metrics (e.g. latency, throughput).",
              "Structure explicitly using STAR (Situation, Task, Action, Result)."
            ]
          };
        }
      }

      // Record interview score for real-time streak
      await prisma.interview.create({
        data: {
          user_id: userId,
          type: (category || 'technical').toLowerCase(),
          score: evaluation.score
        }
      });
    }

    const updatedUser = await updateUserStreak(userId).then(() => 
      prisma.user.findUnique({ where: { id: userId }, include: userInclude })
    );

    res.json({ evaluation, user: updatedUser });
  } catch (error) {
    console.error("Interview review endpoint error:", error);
    res.status(500).json({ error: "Failed to generate interview review." });
  }
});

function generateDynamicMentorResponse(user: any, message: string, page?: string): string {
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const role = user.career_goal || 'Software Engineer';
  const skillsList = user.skills?.map((s: any) => s.skill_name).join(', ') || 'general core skills';
  const activeRoadmap = user.roadmaps?.[0];
  const nextTask = activeRoadmap?.tasks?.find((t: any) => t.status !== 'Completed');
  const lower = message.toLowerCase().trim();

  // Validate gibberish/invalid questions
  const cleanText = lower.replace(/[^a-z0-9\s]/gi, '').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);

  const isGibberish = cleanText.length < 2 || 
    (words.length === 1 && words[0].length > 12 && !words[0].includes('interview') && !words[0].includes('javascript')) ||
    /^(asdf|qwer|zxcv|1234|test12|hhhh|gggg|hjkl)/.test(cleanText);

  if (isGibberish) {
    return `⚠️ That does not appear to be a valid career or technical question. Please ask a valid question related to your career goals, coding skills, interview prep, or learning roadmap (e.g., 'How do I prepare for ${role} interviews?' or 'What project should I build next?').`;
  }

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

    const role = user.career_goal || 'Software Engineer';
    const systemPrompt = `You are Gemini AI Career Mentor for candidate ${user.name}.
Candidate Target Role: ${role}.
Candidate Current Skills: ${user.skills.map(s => `${s.skill_name} (${s.level})`).join(', ') || 'general Technical Skills'}.
Roadmap Context: ${roadmapContext}.
Current App Page: ${page || 'dashboard'}.

IMPORTANT VALIDATION RULES:
1. Evaluate if the candidate query is a VALID career, technical, interview, project, learning, or professional question/greeting.
2. If the user input is INVALID, NONSENSE, GIBBERISH, or random keyboard keys (e.g. 'asdfgh', '12345', 'qqqqq'), respond EXACTLY:
   "⚠️ That does not appear to be a valid career or technical question. Please ask a valid question related to your career goals, coding skills, interview prep, or learning roadmap (e.g., 'How do I prepare for ${role} interviews?' or 'What project should I build next?')."
3. If the question IS valid, provide a helpful, encouraging, and actionable response with 2-3 bullet points and 1 clear next action step.`;

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
