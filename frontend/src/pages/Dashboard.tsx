import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, Target, Code, Award, 
  MessageSquare, FileText, Settings, Bell, Search, Zap, Brain, LogOut, X, UserCircle, Send
} from 'lucide-react';

import DashboardOverview from './dashboard/DashboardOverview';
import MySkills from './dashboard/MySkills';
import Roadmap from './dashboard/Roadmap';
import Courses from './dashboard/Courses';
import Projects from './dashboard/Projects';
import InterviewPrep from './dashboard/InterviewPrep';
import Resume from './dashboard/Resume';
import Profile from './dashboard/Profile';
import { apiUrl } from '../lib/api';

export default function Dashboard() {
  const user = useStore(state => state.user);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI mentor. I can help you choose the next roadmap step, prepare for interviews, or decide what to build next." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Recommended Course added!",
      description: "Check out 'Advanced React Patterns' based on your latest skill updates.",
      time: "Just now",
      isNew: true
    },
    {
      id: 2,
      title: "Mock Interview Score",
      description: "Your recent technical mock interview score has been processed.",
      time: "2 hours ago",
      isNew: false
    }
  ]);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatOpen, chatLoading]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    import('react-hot-toast').then(({ toast }) => {
      toast.success('Logged out successfully');
      useStore.getState().setUser(null);
      useStore.getState().setToken(null);
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    });
  };

  const sendMentorMessage = async (message: string) => {
    if (!message.trim() || chatLoading) return;
    
    const userMessage = message.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, message: userMessage, page: location.pathname })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.message || 'I could not generate a response right now.' }]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMentorMessage(chatInput);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10 text-white font-bold text-lg gap-2 tracking-tight">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          SkillForge AI
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <SidebarItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" end />
          <SidebarItem to="/dashboard/skills" icon={<Award />} label="My Skills" />
          <SidebarItem to="/dashboard/roadmap" icon={<Target />} label="Career Roadmap" />
          <SidebarItem to="/dashboard/courses" icon={<BookOpen />} label="Courses" />
          <SidebarItem to="/dashboard/projects" icon={<Code />} label="Projects" />
          <SidebarItem to="/dashboard/interview-prep" icon={<MessageSquare />} label="Interview Prep" />
          <SidebarItem to="/dashboard/resume" icon={<FileText />} label="Resume" />
        </div>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <NavLink to="/dashboard/profile" className="flex items-center gap-3 flex-1 overflow-hidden hover:bg-white/5 p-2 rounded-lg transition-colors -m-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm text-white font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.career_goal}</p>
              </div>
            </NavLink>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition-colors" title="Log Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex-1 flex items-center">
            <div className="relative w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search courses, skills, or projects..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => n.isNew) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Notifications</h3>
                    {notifications.length > 0 && <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{notifications.length} New</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors relative group">
                          <button 
                            onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Dismiss notification"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-sm font-medium text-slate-900 pr-6">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{n.description}</p>
                          <p className={`text-xs mt-2 font-medium ${n.isNew ? 'text-blue-600' : 'text-slate-400'}`}>{n.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Settings */}
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
              >
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-2">
                    <NavLink to="/dashboard/profile" onClick={() => setShowSettings(false)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2">
                      <UserCircle className="w-4 h-4" /> Profile Details
                    </NavLink>
                    <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 mt-1">
                      <Settings className="w-4 h-4" /> Account Settings
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 mt-1">
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="skills" element={<MySkills />} />
            <Route path="roadmap" element={<Roadmap />} />
            <Route path="courses" element={<Courses />} />
            <Route path="projects" element={<Projects />} />
            <Route path="interview-prep" element={<InterviewPrep />} />
            <Route path="resume" element={<Resume />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </div>

        {/* Floating AI Mentor */}
        <div className={`absolute bottom-6 right-8 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 transform origin-bottom-right z-50 flex flex-col ${chatOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              <span className="font-semibold">AI Career Mentor</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="h-80 bg-slate-50 p-4 overflow-y-auto space-y-4 flex flex-col">
            {messages.length === 1 && (
              <div className="grid grid-cols-1 gap-2">
                {[
                  'What should I do next on my roadmap?',
                  'Which skill should I improve first?',
                  'Give me a 7 day study plan'
                ].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMentorMessage(prompt)}
                    className="text-left text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-3 py-2 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="p-3 bg-white border-t border-slate-100" onSubmit={handleChat}>
            <div className="relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask your mentor..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button type="submit" disabled={!chatInput.trim() || chatLoading} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Chat Toggle Button */}
        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className={`absolute bottom-6 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-transform hover:scale-105 z-50 ${chatOpen ? 'scale-0' : 'scale-100'}`}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </main>
    </div>
  );
}

function SidebarItem({ to, icon, label, end }: { to: string, icon: React.ReactNode, label: string, end?: boolean }) {
  return (
    <NavLink 
      to={to}
      end={end}
      className={({ isActive }) => 
        `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-600/10 text-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
