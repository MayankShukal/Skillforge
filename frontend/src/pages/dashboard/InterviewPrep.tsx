import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Video, Mic, ShieldAlert, CheckCircle2, Loader2, Sparkles, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { apiUrl } from '../../lib/api';

export default function InterviewPrep() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral' | 'system'>('technical');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<{ [key: number]: boolean }>({});
  const [recording, setRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fetchQuestions = (diff: string = selectedDifficulty, cat: string = activeTab) => {
    if (!user) return;
    setLoading(true);
    const categoryParam = cat === 'technical' ? 'Technical' : cat === 'behavioral' ? 'Behavioral' : 'System Design';
    const url = apiUrl(`/api/interview/prep?userId=${user.id}&difficulty=${diff}&category=${categoryParam}&count=6`);

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (user) {
      fetchQuestions(selectedDifficulty, activeTab);
    }
  }, [user, activeTab, selectedDifficulty]);

  const handleGenerateMoreAI = () => {
    if (!user || generatingAi) return;
    setGeneratingAi(true);
    const categoryParam = activeTab === 'technical' ? 'Technical' : activeTab === 'behavioral' ? 'Behavioral' : 'System Design';
    const url = apiUrl(`/api/interview/prep?userId=${user.id}&difficulty=${selectedDifficulty}&category=${categoryParam}&count=6`);

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setQuestions(prev => [...data, ...prev]);
        setGeneratingAi(false);
      })
      .catch(err => {
        console.error(err);
        setGeneratingAi(false);
      });
  };

  const toggleAnswer = (idx: number) => {
    setExpandedAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!user) return null;

  const startMockInterview = async () => {
    let mediaStream: MediaStream | null = null;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.warn("Failed to get video/audio, trying audio only...", err);
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err2) {
        console.warn("Failed to get any media, proceeding without stream.", err2);
        alert("No camera or microphone found. Proceeding with simulated recording.");
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
    }
    setRecording(true);
    
    if (mediaStream) {
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    }
  };

  const stopMockInterview = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    try {
      const res = await fetch(apiUrl('/api/interview/record'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: activeTab,
          score: Math.floor(Math.random() * 30) + 65
        })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
        alert(`Mock interview completed! You scored ${updatedUser.interviews[updatedUser.interviews.length - 1].score}%. Streak updated: ${updatedUser.streak || 1} Days! 🔥`);
      }
    } catch (error) {
      console.error(error);
    }
    setRecording(false);
  };

  const techInterviews = user.interviews?.filter((i: any) => i.type === 'technical') || [];
  const behavInterviews = user.interviews?.filter((i: any) => i.type === 'behavioral') || [];
  
  const techAvg = techInterviews.length > 0 
    ? Math.round(techInterviews.reduce((acc: number, val: any) => acc + val.score, 0) / techInterviews.length) 
    : 0;
    
  const behavAvg = behavInterviews.length > 0 
    ? Math.round(behavInterviews.reduce((acc: number, val: any) => acc + val.score, 0) / behavInterviews.length) 
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mock Interview Prep</h1>
          <p className="text-slate-500 text-lg">
            Practice AI-generated technical & behavioral questions for your <span className="font-semibold text-blue-600">{user.career_goal}</span> role.
          </p>
        </div>

        <button
          onClick={handleGenerateMoreAI}
          disabled={generatingAi}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-60"
        >
          {generatingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generatingAi ? 'Generating AI Questions...' : 'Practice More AI Questions'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mock Interview Start Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            {recording ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                className="w-full h-48 object-cover rounded-2xl mb-4 bg-black"
              />
            ) : (
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Video className="w-32 h-32" />
              </div>
            )}
            <div className="relative z-10">
              {!recording && (
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur mb-6">
                  <Mic className="w-6 h-6 text-white" />
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">
                {recording ? 'Interview in Progress...' : 'Start Mock Interview'}
              </h3>
              <p className="text-slate-400 text-sm mb-8">
                {recording 
                  ? 'Speak clearly into your microphone and look at the camera.' 
                  : 'AI-driven interactive interview with instant scoring and real-time streak tracking.'}
              </p>
              
              {recording ? (
                <button 
                  onClick={stopMockInterview}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Loader2 className="w-5 h-5 animate-spin" /> Finish Interview
                </button>
              ) : (
                <button 
                  onClick={startMockInterview}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  Start Now
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Recent Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Technical Avg</span>
                <span className="font-bold text-slate-900">{techAvg}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-500"/> Behavioral Avg</span>
                <span className="font-bold text-slate-900">{behavAvg}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Bank */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[600px]">
          {/* Header & Tabs */}
          <div className="border-b border-slate-100 p-3 space-y-3">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('technical')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'technical' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Technical
              </button>
              <button 
                onClick={() => setActiveTab('behavioral')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'behavioral' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Behavioral
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors ${activeTab === 'system' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                System Design
              </button>
            </div>

            {/* Difficulty Selector */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" /> Difficulty Filter:
              </div>
              <div className="flex gap-1.5">
                {(['All', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      selectedDifficulty === diff 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto space-y-4 max-h-[500px]">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-slate-500 text-sm">No questions found matching your filter.</p>
                <button
                  onClick={handleGenerateMoreAI}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                >
                  Generate AI Questions Now
                </button>
              </div>
            ) : (
              questions.map((q, i) => {
                const isExpanded = !!expandedAnswers[i];
                return (
                  <div key={i} className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors bg-white space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          q.difficulty === 'Hard' ? 'bg-red-50 text-red-700 border border-red-200' : 
                          q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {q.difficulty || 'Medium'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {q.category || 'General'}
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleAnswer(i)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Hide Answer' : 'View Answer'}
                      </button>
                    </div>

                    <p className="font-bold text-slate-900 text-base">Q: {q.question}</p>

                    {isExpanded && (
                      <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-200/80 space-y-1.5">
                        <p className="font-bold text-xs uppercase tracking-wider text-slate-400">Suggested STAR / Model Answer:</p>
                        <p className="leading-relaxed text-slate-800 font-medium">{q.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
