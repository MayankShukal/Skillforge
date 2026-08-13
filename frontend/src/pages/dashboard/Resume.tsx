import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { FileText, Download, UploadCloud, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Resume() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const [uploading, setUploading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [mockScore, setMockScore] = useState<number | null>(null);
  const [mockDate, setMockDate] = useState<string | null>(null);
  const [mockFileName, setMockFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      setMockFileName(file.name);
      // Simulate an upload and AI parsing delay
      setTimeout(() => {
        setUploading(false);
        setIsDeleted(false);
        setMockScore(92); // Fake new ATS score
        setMockDate(new Date().toLocaleDateString());
        
        // Automatically extract skills and add to user profile
        const extractedSkills = [
          { skill_name: 'Docker (Extracted)', category: 'Technical', level: 'Intermediate', score: 75 },
          { skill_name: 'Team Leadership', category: 'Soft', level: 'Advanced', score: 85 }
        ];
        
        if (user) {
          setUser({
            ...user,
            skills: [...(user.skills || []), ...extractedSkills]
          });
          toast.success("Extracted 2 new skills from your resume and added them to your profile!");
        }
        
        toast.success("Resume uploaded and analyzed successfully! New ATS Score: 92%");
      }, 2500);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete your resume?")) {
      setIsDeleted(true);
      setMockScore(null);
      setMockDate(null);
      setMockFileName(null);
    }
  };

  if (!user) return null;

  const latestResume = user.resumes?.[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Resume Analyzer</h1>
        <p className="text-slate-500 text-lg">
          Manage and optimize your resumes for ATS systems.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="relative w-48 h-64 bg-slate-100 rounded-xl border-2 border-slate-200 overflow-hidden flex-shrink-0 group flex items-center justify-center cursor-pointer">
            <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Download className="w-8 h-8 text-blue-600" />
            </div>
            <FileText className="w-16 h-16 text-slate-300" />
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-slate-900 line-clamp-1" title={mockFileName || "Primary Resume"}>
                  {mockFileName || "Primary Resume"}
                </h2>
                {!isDeleted && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-sm shrink-0 ml-4">
                    ATS Score: {mockScore !== null ? mockScore : (latestResume?.resume_score || 85)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {isDeleted ? (
                  "No resume uploaded."
                ) : (
                  `Last updated: ${mockDate !== null ? mockDate : (latestResume ? new Date(latestResume.createdAt).toLocaleDateString() : 'Just now')}`
                )}
              </p>
            </div>
            
            {!isDeleted ? (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">AI Suggestions</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-slate-600 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    Add more quantifiable metrics to your recent experience (e.g. "Increased performance by X%").
                  </li>
                  <li className="flex gap-3 text-slate-600 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    Include the keyword "Docker" since it's highly requested for your target role.
                  </li>
                </ul>
              </div>
            ) : (
              <div className="py-4 text-slate-500">
                Upload a resume to get AI-powered feedback and ATS scoring.
              </div>
            )}
            
            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".pdf" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-semibold transition-colors disabled:opacity-70"
              >
                {uploading ? (
                  <>Uploading & Analyzing...</>
                ) : (
                  <><UploadCloud className="w-5 h-5" /> {isDeleted ? 'Upload Resume' : 'Upload New Version'}</>
                )}
              </button>

              {!isDeleted && (
                <button 
                  onClick={handleDelete}
                  disabled={uploading}
                  className="px-6 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl font-semibold transition-colors disabled:opacity-70"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
