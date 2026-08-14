import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Target, TrendingUp, Zap, MessageSquare, CheckCircle2, ChevronRight, FileText, PlayCircle, X, Loader2, Sparkles, Mic, Video, Award, RotateCcw, BookOpen, AlertTriangle, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { apiUrl } from '../../lib/api';



export default function DashboardOverview() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Course Progress Tracking state (synced with localStorage)
  const [courseProgress, setCourseProgress] = useState<{ [key: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('skillforce_course_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active Video Modal
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  // Dynamic Interview Practice Mode State
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [aiReview, setAiReview] = useState<any | null>(null);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (user) {
      fetch(apiUrl(`/api/recommendations?userId=${user.id}`))
        .then(res => res.json())
        .then(data => setRecommendations(Array.isArray(data) ? data : []));

      fetch(apiUrl(`/api/interview/prep?userId=${user.id}`))
        .then(res => res.json())
        .then(data => setQuestions(Array.isArray(data) ? data : []));

      fetch(apiUrl(`/api/courses/recommended?userId=${user.id}`))
        .then(res => res.json())
        .then(data => setCourses(Array.isArray(data) ? data : []));
    }
  }, [user]);

  const updateProgress = (courseId: string, percent: number) => {
    const updated = { ...courseProgress, [courseId]: percent };
    setCourseProgress(updated);
    try {
      localStorage.setItem('skillforce_course_progress', JSON.stringify(updated));
    } catch (e) {
      console.error("Save progress error:", e);
    }
  };

  const defaultVideos = [
    'https://www.youtube.com/watch?v=17m0Iev3Pzw',
    'https://www.youtube.com/watch?v=HXV3zeQKqGY',
    'https://www.youtube.com/watch?v=bBTPHL9NwM8',
    'https://www.youtube.com/watch?v=GwIo3gDZCVQ',
    'https://www.youtube.com/watch?v=1vZOEGNaAA8'
  ];

  const getValidVideoUrl = (rawUrl?: string, idx: number = 0) => {
    if (typeof rawUrl === 'string' && (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be'))) {
      return rawUrl;
    }
    return defaultVideos[idx % defaultVideos.length];
  };

  const getEmbedUrl = (url?: string) => {
    const validUrl = getValidVideoUrl(url, 0);
    if (validUrl.includes('youtube.com/embed/')) {
      return validUrl.includes('?') ? `${validUrl}&autoplay=1` : `${validUrl}?autoplay=1`;
    }
    const match = validUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return 'https://www.youtube.com/embed/17m0Iev3Pzw?autoplay=1';
  };

  // Recording handler for practice mode
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      setIsRecording(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(audioStream);
        setIsRecording(true);
      } catch {
        alert("Camera/Mic not detected. Simulated recording mode activated.");
        setIsRecording(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
    setIsRecording(false);
    if (!userAnswer.trim()) {
      setUserAnswer(`I will architect this using clean component abstraction, robust API input validation, centralized error handling, and performance optimization techniques.`);
    }
  };

  const handleReviewSubmit = async (overrideMode?: string) => {
    if (!user) return;
    const mode = overrideMode || (userAnswer.toLowerCase().includes("don't know") || userAnswer.toLowerCase().includes("dont know") ? 'explain' : 'review');
    
    setEvaluating(true);
    const qObj = questions[currentQIndex] || { question: "General Interview Question", category: "Technical", difficulty: "Medium" };
    
    try {
      const res = await fetch(apiUrl('/api/interview/review'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          question: qObj.question,
          answer: mode === 'explain' && !userAnswer.trim() ? "I don't know this topic, please explain." : userAnswer,
          category: qObj.category,
          difficulty: qObj.difficulty,
          mode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiReview(data.evaluation);
        if (data.user) setUser(data.user);
        setShowContinuePrompt(true);
      }
    } catch (err) {
      console.error(err);
    }
    setEvaluating(false);
  };

  const handleNextQuestion = () => {
    setShowContinuePrompt(false);
    setAiReview(null);
    setUserAnswer('');
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      // Refresh questions
      if (user) {
        fetch(apiUrl(`/api/interview/prep?userId=${user.id}`))
          .then(r => r.json())
          .then(d => {
            setQuestions(Array.isArray(d) ? d : []);
            setCurrentQIndex(0);
          });
      }
    }
  };

  const closePracticeModal = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
    setIsRecording(false);
    setPracticeModalOpen(false);
    setAiReview(null);
    setShowContinuePrompt(false);
    setUserAnswer('');
  };

  if (!user) return null;

  const hasResume = user.resumes && user.resumes.length > 0;
  const currentStreak = hasResume ? (user.streak || 1) : 0;

  const avgInterviewScore = (user.interviews && user.interviews.length > 0 && hasResume)
    ? Math.round(user.interviews.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / user.interviews.length)
    : 0;

  // Dynamic Progress Calculations
  const skillScoreAvg = (hasResume && user.skills && user.skills.length > 0)
    ? Math.round(user.skills.reduce((acc: number, s: any) => acc + (s.score || 50), 0) / user.skills.length)
    : 0;

  const roadmapProgress = user.roadmaps?.[0]?.progress || 0;

  const courseProgressList = Object.values(courseProgress);
  const avgCourseProgress = courseProgressList.length > 0
    ? Math.round(courseProgressList.reduce((acc, p) => acc + (p || 0), 0) / courseProgressList.length)
    : 0;

  // Dynamic Career Readiness Score (0-100)
  const calculatedReadiness = hasResume
    ? Math.min(100, Math.max(30, Math.round((skillScoreAvg * 0.35) + (roadmapProgress * 0.3) + (avgCourseProgress * 0.2) + (avgInterviewScore * 0.15))))
    : 0;

  // Dynamic Progress Data for Readiness Trend Line Chart
  const dynamicProgressData = hasResume ? [
    { name: 'Week 1', score: Math.max(5, Math.round(calculatedReadiness * 0.4)) },
    { name: 'Week 2', score: Math.max(15, Math.round(calculatedReadiness * 0.65)) },
    { name: 'Week 3', score: Math.max(25, Math.round(calculatedReadiness * 0.85)) },
    { name: 'Week 4', score: calculatedReadiness },
  ] : [
    { name: 'Week 1', score: 0 },
    { name: 'Week 2', score: 0 },
    { name: 'Week 3', score: 0 },
    { name: 'Week 4', score: 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Good morning, {user.name.split(' ')[0]} </h1>
        <p className="text-slate-500 text-lg">
          Your AI career mentor has prepared today's plan to get you closer to your <span className="font-semibold text-blue-600">{user.career_goal}</span> role.
        </p>
      </div>

      {!hasResume && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden border border-slate-800">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shrink-0">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">No Resume Uploaded</h3>
              <p className="text-slate-400 text-sm">
                Upload your PDF resume under <strong>Resume Analyzer</strong> to extract verified skills, compute ATS scores, and unlock skill gap tracking.
              </p>
            </div>
          </div>
          <Link to="/dashboard/resume" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-colors relative z-10">
            Upload Resume
          </Link>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Career Readiness" value={`${calculatedReadiness}/100`} subtitle={hasResume ? "Getting close!" : "Upload resume to calculate"} trend={hasResume ? "+8% this month" : undefined} icon={<Target className="text-blue-500" />} />
        <StatCard title="Learning Progress" value={hasResume ? `${Math.max(roadmapProgress, avgCourseProgress)}%` : "0%"} subtitle={hasResume ? "Overall Completion" : "No active resume progress"} trend={hasResume ? "+2% this week" : undefined} icon={<TrendingUp className="text-emerald-500" />} />
        <StatCard title="Current Streak" value={`${currentStreak} Days`} subtitle={currentStreak > 0 ? "On fire! 🔥" : "Upload resume to activate"} icon={<Zap className="text-amber-500" />} />
        <StatCard title="Interview Score" value={`${avgInterviewScore}%`} subtitle={user.interviews?.length ? `Avg across ${user.interviews.length} mocks` : "No mock interviews yet"} icon={<MessageSquare className="text-purple-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Plan & Readiness */}
        <div className="lg:col-span-2 space-y-8">

          {/* Readiness Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Career Readiness Score</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">
                {hasResume ? "Placement Ready in 4 weeks" : "Upload Resume to Unlock"}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" className="stroke-slate-100" strokeWidth="12" fill="none" />
                  <circle cx="80" cy="80" r="70" className="stroke-blue-600" strokeWidth="12" fill="none" strokeDasharray="440" strokeDashoffset={hasResume ? 440 - (440 * calculatedReadiness) / 100 : 440} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{calculatedReadiness}</span>
                  <span className="text-sm font-medium text-slate-500">/100</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-4">
                <h4 className="font-semibold text-slate-900">Skill Gap Assessment</h4>
                {hasResume && user.skills && user.skills.length > 0 ? (
                  <div className="space-y-3">
                    {user.skills.filter((s: any) => (s.score || 0) < 60).slice(0, 3).map((s: any, i: number) => (
                      <GapBar key={i} skill={s.skill_name} score={s.score || 40} />
                    )) || (
                      <p className="text-xs text-slate-500 italic">No major skill gaps identified.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No skills extracted. Upload your resume under Resume Analyzer to perform skill gap analysis.</p>
                )}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4 text-sm flex items-start gap-2 text-blue-900">
                  <Zap className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <p><span className="font-semibold">AI Recommendation:</span> {hasResume ? "Focus on SQL optimization and core architecture patterns." : "Upload your resume to receive AI-tailored career advice."}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Today's AI Plan</h3>
              <Link to="/dashboard/roadmap" className="text-sm font-medium text-blue-600 hover:text-blue-700">View Full Roadmap</Link>
            </div>
            <div className="space-y-3">
              {user.roadmaps?.[0]?.tasks?.map((task: any, index: number) => (
                <TaskItem
                  key={task.id || index}
                  title={task.title}
                  duration={task.duration}
                  done={task.status === 'Completed'}
                />
              )) || (
                  <p className="text-slate-500 text-sm">No tasks assigned for today yet.</p>
                )}
            </div>
          </div>

        </div>

        {/* Right Column: Progress Chart & Skills */}
        <div className="space-y-8">

          {/* Progress Over Time */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Readiness Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dynamicProgressData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Skill Matrix</h3>
            {hasResume && user.skills && user.skills.length > 0 ? (
              <div className="space-y-4">
                {user.skills.map((s: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{s.skill_name}</span>
                      <span className="text-slate-500">{s.score || 50}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${(s.score || 50) > 70 ? 'bg-emerald-500' : (s.score || 50) > 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                        style={{ width: `${s.score || 50}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl">
                No resume uploaded. Upload your resume to extract skills and display matrix.
              </div>
            )}
            <Link to="/dashboard/skills" className="w-full mt-6 block text-center py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-lg text-sm border border-slate-200 transition-colors">
              Manage Skills
            </Link>
          </div>
        </div>
      </div>

      {/* Recommendations & Interview Prep */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* AI Recommendations Linked with Actual Courses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-900">AI Recommendations</h3>
              <p className="text-xs text-slate-500 font-medium">Linked directly to video courses & progress tracking</p>
            </div>
            <Link to="/dashboard/courses" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All Courses</Link>
          </div>

          <div className="space-y-4">
            {recommendations.length > 0 ? recommendations.map((rec, i) => {
              const matchedCourse = {
                id: (courses && courses.length > 0 && courses[i % courses.length]?.id) || rec.id || `rec-${i}`,
                title: rec.title || (courses && courses.length > 0 && courses[i % courses.length]?.title) || 'Recommended Skill Course',
                provider: (courses && courses.length > 0 && courses[i % courses.length]?.provider) || 'SkillForge Academy',
                videoUrl: getValidVideoUrl(rec.videoUrl || (courses && courses.length > 0 && courses[i % courses.length]?.videoUrl), i)
              };
              const courseId = matchedCourse.id;
              const progress = courseProgress[courseId] || 0;

              return (
                <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 transition-all space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">{matchedCourse.title}</h4>
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md ${rec.type === 'course' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {rec.type || 'Course'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">"{rec.justification || 'Tailored to boost your technical career goals.'}"</p>
                    </div>

                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-3 ${
                      progress === 100 ? 'bg-emerald-100 text-emerald-700' :
                      progress > 0 ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {progress === 100 ? 'Completed 🎉' : progress > 0 ? `${progress}% In Progress` : 'Not Started'}
                    </span>
                  </div>

                  {/* Course Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Course Completion</span>
                      <span className="font-bold text-slate-700">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setActiveVideo(matchedCourse)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
                    >
                      <PlayCircle className="w-4 h-4" /> Watch Tutorial
                    </button>
                    <a
                      href={matchedCourse.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors shrink-0 flex items-center justify-center"
                      title="Open Video Link in YouTube"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {progress < 100 ? (
                      <button
                        onClick={() => updateProgress(courseId, progress === 0 ? 50 : 100)}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        {progress === 0 ? '+50% Progress' : 'Mark 100%'}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateProgress(courseId, 0)}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Reset progress"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
              </div>
            )}
          </div>
        </div>

        {/* Interview Prep with Dynamic Practice Mode Button */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Interview Prep</h3>
              <p className="text-xs text-slate-500 font-medium">Practice mock questions with instant Gemini verification</p>
            </div>
            <button
              onClick={() => { setPracticeModalOpen(true); setCurrentQIndex(0); setAiReview(null); setShowContinuePrompt(false); setUserAnswer(''); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <Sparkles className="w-4 h-4" /> Practice Mock
            </button>
          </div>

          <div className="space-y-4">
            {questions.length > 0 ? questions.slice(0, 3).map((q, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 transition-colors">
                <div className="flex gap-2 mb-2">
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{q.category || 'Technical'}</span>
                  <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{q.difficulty || 'Medium'}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">Q: {q.question}</p>
                <p className="text-xs text-slate-600 line-clamp-2">A: {q.answer}</p>
              </div>
            )) : (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-800 shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white line-clamp-1">{activeVideo.title}</h3>
                  <p className="text-xs text-slate-400 font-medium">{activeVideo.provider || 'SkillForge AI Tutorial'}</p>
                </div>
              </div>

              <button onClick={() => setActiveVideo(null)} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={getEmbedUrl(activeVideo.videoUrl)}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-5 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Watching tutorial directly on Dashboard</span>
              <div className="flex items-center gap-2">
                <a
                  href={activeVideo.videoUrl || 'https://www.youtube.com/watch?v=17m0Iev3Pzw'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
                >
                  <ExternalLink className="w-4 h-4" /> Open in YouTube
                </a>
                <button
                  onClick={() => {
                    if (activeVideo.id) updateProgress(activeVideo.id, 100);
                    setActiveVideo(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  Mark Course Completed (100%)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Interview Practice Mock Modal */}
      {practiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Dynamic AI Practice Mode</h3>
                  <p className="text-xs text-slate-400 font-medium">Question {currentQIndex + 1} of {questions.length || 1}</p>
                </div>
              </div>
              <button onClick={closePracticeModal} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {!showContinuePrompt ? (
                <>
                  {/* Current Question Display */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-md">
                        {questions[currentQIndex]?.category || 'Technical'}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                        {questions[currentQIndex]?.difficulty || 'Medium'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-lg">
                      {questions[currentQIndex]?.question || 'How would you architect a production-ready application for your target role?'}
                    </h4>
                  </div>

                  {/* Audio / Video Recording Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Your Response:</label>
                      {isRecording ? (
                        <button onClick={stopRecording} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                          <Mic className="w-3.5 h-3.5" /> Recording... (Click to Stop)
                        </button>
                      ) : (
                        <button onClick={startRecording} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                          <Video className="w-3.5 h-3.5" /> Record Voice/Video Response
                        </button>
                      )}
                    </div>

                    {isRecording && (
                      <video ref={videoRef} autoPlay muted className="w-full h-40 bg-black rounded-2xl object-cover" />
                    )}

                    <textarea
                      rows={5}
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      placeholder="Type your structured STAR format answer here... (Or click 'I Don't Know / Explain Topic' below if you want Gemini to explain)"
                      className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-sm text-slate-800"
                    />
                  </div>

                  {/* Submit & Explain Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleReviewSubmit('review')}
                      disabled={evaluating || !userAnswer.trim()}
                      className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {evaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                      {evaluating ? 'Gemini Verifying...' : 'Verify Answer with Gemini'}
                    </button>

                    <button
                      onClick={() => handleReviewSubmit('explain')}
                      disabled={evaluating}
                      className="px-5 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <BookOpen className="w-5 h-5" /> I Don't Know / Explain Topic
                    </button>
                  </div>
                </>
              ) : (
                /* AI Review Screen / Gemini Topic Explanation & Continue Prompt */
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Score / Mode / Wrong Answer Banner */}
                  <div className={`p-6 text-white rounded-2xl space-y-4 relative overflow-hidden ${
                    aiReview?.isExplanation ? 'bg-indigo-950 border border-indigo-800' :
                    (aiReview?.isWrong || (aiReview?.score || 0) < 60) ? 'bg-red-950 border border-red-800' :
                    'bg-slate-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        {(aiReview?.isWrong || (aiReview?.score || 0) < 60) ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-amber-400" />
                        )}
                        {aiReview?.isExplanation ? 'Gemini AI Topic & Concept Explanation' : 
                         (aiReview?.isWrong || (aiReview?.score || 0) < 60) ? '❌ Answer Incorrect / Needs Improvement' : 
                         'Gemini AI Answer Verification'}
                      </span>
                      {!aiReview?.isExplanation ? (
                        <span className={`text-2xl font-black px-4 py-1 rounded-2xl shadow-lg text-white ${
                          (aiReview?.isWrong || (aiReview?.score || 0) < 60) ? 'bg-red-600' : 'bg-emerald-500'
                        }`}>
                          {aiReview?.score || 35}%
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-amber-500/30 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" /> Concept Guide
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-line">
                      {aiReview?.summary || 'Review completed.'}
                    </div>
                  </div>

                  {/* Topic Explanation Section if answer is wrong or explanation mode */}
                  {aiReview?.topicExplanation && (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <h5 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-amber-600" /> Deep Dive Topic Explanation
                      </h5>
                      <p className="text-xs text-amber-900 font-medium leading-relaxed whitespace-pre-line">
                        {aiReview.topicExplanation}
                      </p>
                    </div>
                  )}

                  {/* Strengths / Key Concepts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                      <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {aiReview?.isExplanation ? 'Key Concepts to Remember' : 'Key Technical Strengths'}
                      </h5>
                      <ul className="space-y-1.5 text-xs text-emerald-800 font-medium">
                        {(aiReview?.strengths || ["Core concept structure", "Relevant technical terms"]).map((st: string, idx: number) => (
                          <li key={idx}>• {st}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <h5 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-600" /> {aiReview?.isExplanation || aiReview?.isWrong ? 'Ideal STAR Answer Plan' : 'Areas for Improvement'}
                      </h5>
                      <ul className="space-y-1.5 text-xs text-amber-800 font-medium">
                        {(aiReview?.improvements || ["Include quantitative outcomes", "Structure via STAR"]).map((imp: string, idx: number) => (
                          <li key={idx}>• {imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Continuation Prompt Card */}
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-4">
                    <h4 className="font-extrabold text-blue-950 text-base">
                      {aiReview?.isExplanation || aiReview?.isWrong ? "Ready to try another practice question?" : "Would you like to continue practicing?"}
                    </h4>
                    <p className="text-xs text-blue-800 max-w-md mx-auto">
                      {aiReview?.isExplanation || aiReview?.isWrong
                        ? "Reviewing topics & practicing correct answers builds real candidate confidence!" 
                        : "Your answer has been verified by Gemini AI and recorded to your live activity streak."}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={handleNextQuestion}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-blue-500/20"
                      >
                        {aiReview?.isExplanation || aiReview?.isWrong ? 'Practice Next Question' : 'Continue Practicing (Next Question)'}
                      </button>
                      <button
                        onClick={closePracticeModal}
                        className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-colors"
                      >
                        Finish & Return to Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
          {icon}
        </div>
        {trend && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function GapBar({ skill, score }: { skill: string, score: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-slate-700">{skill}</span>
        <span className="font-bold text-red-500">{score}%</span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TaskItem({ title, duration, done }: { title: string, duration: string, done?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${done ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="mt-0.5">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{duration}</p>
      </div>
      {!done && (
        <button className="text-slate-400 hover:text-blue-600">
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}


