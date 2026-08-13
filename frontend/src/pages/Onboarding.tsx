import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Upload, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../lib/api';

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useStore(state => state.user);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const setUser = useStore(state => state.setUser);
  
  // State for onboarding form
  const [careerGoal, setCareerGoal] = useState(user?.career_goal || '');
  const [college, setCollege] = useState(user?.college || '');
  const [graduationYear, setGraduationYear] = useState(user?.graduation_year?.toString() || '');
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400 mb-6">
            <span className={step >= 1 ? "text-blue-600" : ""}>1. Profile</span>
            <span className="w-8 h-px bg-slate-200" />
            <span className={step >= 2 ? "text-blue-600" : ""}>2. Resume</span>
            <span className="w-8 h-px bg-slate-200" />
            <span className={step >= 3 ? "text-blue-600" : ""}>3. Analysis</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Let's build your career profile</h2>
          <p className="text-slate-500">We'll analyze your skills and create a personalized roadmap.</p>
        </div>
        
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Career Role</label>
                <input type="text" value={careerGoal} onChange={e => setCareerGoal(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">College/University</label>
                  <input type="text" value={college} onChange={e => setCollege(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Graduation Year</label>
                  <input type="text" value={graduationYear} onChange={e => setGraduationYear(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none" />
                </div>
              </div>
              
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-8"
              >
                Continue to Resume Upload <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                onClick={() => document.getElementById('resume-upload')?.click()}
              >
                <input type="file" id="resume-upload" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload your resume</h3>
                <p className="text-slate-500 text-sm">PDF or DOCX (Max 5MB)</p>
                {file && <p className="mt-4 text-blue-600 font-medium">Selected: {file.name}</p>}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-3 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50">Back</button>
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // 1. Update Onboarding Profile
                      const profileRes = await fetch(apiUrl('/api/onboarding'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, career_goal: careerGoal, college, graduation_year: graduationYear })
                      });
                      let updatedUser = await profileRes.json();
                      
                      // 2. Upload Resume if exists
                      if (file) {
                        const formData = new FormData();
                        formData.append('resume', file);
                        formData.append('userId', user.id);
                        
                        const resumeRes = await fetch(apiUrl('/api/resume/upload'), {
                          method: 'POST',
                          body: formData
                        });
                        updatedUser = await resumeRes.json();
                      }
                      
                      // 3. Generate Roadmap
                      const roadmapRes = await fetch(apiUrl('/api/roadmap/generate'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, targetRole: careerGoal })
                      });
                      updatedUser = await roadmapRes.json();
                      
                      setUser(updatedUser);
                      setStep(3);
                    } catch (error) {
                      console.error("Failed onboarding:", error);
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? 'Analyzing...' : 'Analyze Profile'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Profile Analyzed!</h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                We've extracted your skills, identified gaps for {user.career_goal}, and generated your personalized learning roadmap.
              </p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                Go to My Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
