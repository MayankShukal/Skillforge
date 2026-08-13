import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Code, Target, Trophy, ArrowRight, Zap, BookOpen, Briefcase } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span>SkillForge AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link to="/register" className="text-sm font-medium bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8"
          >
            <SparklesIcon className="w-4 h-4" />
            Your AI-Powered Career Mentor
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent"
          >
            Turn your current skills into <br className="hidden md:block" />
            your dream career.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Upload your resume, find your skill gaps, and get a personalized AI roadmap to become placement-ready in weeks, not years.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] w-full sm:w-auto justify-center">
              Build your career with AI <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-semibold border border-white/10 transition-colors w-full sm:w-auto justify-center">
              View Demo
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-slate-900 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How SkillForge AI Works</h2>
            <p className="text-slate-400">An intelligent pipeline from resume to job offer.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<BookOpen />}
              title="Resume Analysis"
              desc="Upload your resume and let our AI instantly extract your skills, score your profile, and identify critical gaps for your target role."
            />
            <FeatureCard 
              icon={<Target />}
              title="Smart Roadmaps"
              desc="Get a dynamic, personalized learning path that adapts to your progress and available time."
            />
            <FeatureCard 
              icon={<Code />}
              title="Project Recommendations"
              desc="Build real-world projects that matter. AI suggests the exact projects missing from your portfolio."
            />
            <FeatureCard 
              icon={<Zap />}
              title="AI Mentor Chatbot"
              desc="Stuck on a concept? Your 24/7 AI career mentor is ready to explain topics or update your study plan."
            />
            <FeatureCard 
              icon={<Briefcase />}
              title="Mock Interviews"
              desc="Practice technical, HR, and behavioral questions with real-time AI feedback and scoring."
            />
            <FeatureCard 
              icon={<Trophy />}
              title="Career Readiness Score"
              desc="Track your overall readiness for placements and know exactly what's holding you back."
            />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6 text-center text-slate-500 border-t border-white/5">
        <p>© 2026 SkillForge AI. Built for the Hackathon.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-blue-500/10 blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors" />
      <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}
