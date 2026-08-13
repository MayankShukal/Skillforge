# SkillForge AI 🚀

An AI-powered career mentor platform designed to analyze skills, bridge learning gaps, generate personalized roadmaps, and prepare students & job seekers for placements.

## 🌟 Key Features
- **AI Career Mentorship**: Chat 24/7 with an AI career mentor for personalized study guidance.
- **Smart Career Roadmaps**: Generate dynamic, step-by-step learning paths for target roles (Full Stack Engineer, ML Engineer, DevOps, etc.).
- **Resume Skill Extraction & Analysis**: Instantly extract technical & soft skills from uploaded resumes.
- **Mock Interview Preparation**: Practice role-specific technical and behavioral interview questions.
- **Interactive Dashboard**: Track your overall Career Readiness Score, learning progress, streaks, and recommended courses.

## 🛠️ Tech Stack
- **Frontend**: React (TypeScript), Vite, TailwindCSS, Zustand, Lucide Icons, React Router
- **Backend**: Node.js, Express, Prisma ORM, TypeScript, OpenAI API, PDF Parse
- **Database**: SQLite / MongoDB

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### 1. Clone Repository
```bash
git clone https://github.com/MayankShukal/Skillforce.git
cd Skillforce
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser!
