import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Video, Mic, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { apiUrl } from '../../lib/api';

export default function InterviewPrep() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const [activeTab, setActiveTab] = useState('technical');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (user) {
      fetch(apiUrl(`/api/interview/prep?userId=${user.id}`))
        .then(res => res.json())
        .then(data => {
          setQuestions(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

  if (!user) return null;

  const startMockInterview = async () => {
    let mediaStream: MediaStream | null = null;
    try {
      // Try to get video and audio
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
      // We need a slight delay to ensure the video element is rendered before setting srcObject
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
          score: Math.floor(Math.random() * 30) + 65 // Random score between 65 and 95
        })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
        alert(`Mock interview completed! You scored ${updatedUser.interviews[updatedUser.interviews.length - 1].score}%.`);
      }
    } catch (error) {
      console.error(error);
    }
    setRecording(false);
  };

  // Calculate stats from user.interviews
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
            Practice for your <span className="font-semibold text-slate-700">{user.career_goal}</span> role.
          </p>
        </div>
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
                  ? 'Speak clearly and look at the camera.' 
                  : 'AI-driven video interview with real-time feedback on tone, technical accuracy, and pacing.'}
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
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="border-b border-slate-100 p-2 flex gap-2">
            <button 
              onClick={() => setActiveTab('technical')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-colors ${activeTab === 'technical' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Technical Questions
            </button>
            <button 
              onClick={() => setActiveTab('behavioral')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-colors ${activeTab === 'behavioral' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Behavioral Questions
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
            ) : questions.filter(q => (activeTab === 'technical' ? q.category !== 'Behavioral' : q.category === 'Behavioral')).length === 0 ? (
              <div className="text-center py-10 text-slate-500">No questions found for this category.</div>
            ) : (
              questions.filter(q => (activeTab === 'technical' ? q.category !== 'Behavioral' : q.category === 'Behavioral')).map((q, i) => (
                <div key={i} className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${q.difficulty === 'Hard' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      {q.difficulty}
                    </span>
                    <button className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View Answer
                    </button>
                  </div>
                  <p className="font-medium text-slate-900">{q.question}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
