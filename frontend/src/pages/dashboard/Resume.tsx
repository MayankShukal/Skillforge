import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { FileText, Download, UploadCloud, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiUrl } from '../../lib/api';

export default function Resume() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!user) return null;

  const latestResume = user.resumes?.[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('userId', user.id);

      const res = await fetch(apiUrl('/api/resume/upload'), {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data);
        toast.success("Resume uploaded & analyzed successfully! Skills extracted to your profile.");
      } else {
        toast.error(data.error || "Failed to upload resume.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading resume.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!latestResume) return;
    if (window.confirm("Are you sure you want to delete your resume and remove extracted skills?")) {
      setUploading(true);
      try {
        const res = await fetch(apiUrl(`/api/resume/${latestResume.id}`), {
          method: 'DELETE'
        });

        const data = await res.json();
        if (res.ok) {
          setUser(data);
          toast.success("Resume deleted and extracted skills cleaned up.");
        } else {
          toast.error(data.error || "Failed to delete resume.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error deleting resume.");
      } finally {
        setUploading(false);
      }
    }
  };

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
                <h2 className="text-2xl font-bold text-slate-900 line-clamp-1" title={latestResume ? (latestResume.file_url || "Primary Resume.pdf") : "Primary Resume"}>
                  {latestResume ? (latestResume.file_url || "Primary Resume.pdf") : "No Resume Uploaded"}
                </h2>
                {latestResume && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-sm shrink-0 ml-4">
                    ATS Score: {latestResume.resume_score || 85}%
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {latestResume ? (
                  `Last updated: ${new Date(latestResume.createdAt).toLocaleDateString()}`
                ) : (
                  "Upload your resume to extract skills and calculate ATS score."
                )}
              </p>
            </div>
            
            {latestResume ? (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">AI Suggestions & Extracted Skills</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-slate-600 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    Add quantifiable metrics to your work experience sections (e.g. "Improved performance by 30%").
                  </li>
                  <li className="flex gap-3 text-slate-600 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    Verified skills are automatically extracted and synced with your <strong>My Skills</strong> profile.
                  </li>
                </ul>
              </div>
            ) : (
              <div className="py-4 text-slate-500 text-sm">
                Upload a PDF resume to instantly extract your technical and soft skills, calculate your ATS score, and boost your recommendations.
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
                  <>Processing Resume...</>
                ) : (
                  <><UploadCloud className="w-5 h-5" /> {latestResume ? 'Upload New Version' : 'Upload Resume'}</>
                )}
              </button>

              {latestResume && (
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
