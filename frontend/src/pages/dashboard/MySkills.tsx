import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Award, Zap, Plus, X, Trash2 } from 'lucide-react';
import { apiUrl } from '../../lib/api';

export default function MySkills() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  
  const [showModal, setShowModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Technical');
  const [newSkillLevel, setNewSkillLevel] = useState('Beginner');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const validSkills = (user.skills || [])
    .map((s: any) => ({
      ...s,
      formattedName: (typeof s.skill_name === 'string' ? s.skill_name : String(s.skill_name || '')).replace(/[{}"'`]/g, '').trim()
    }))
    .filter((s: any) => s.formattedName && !s.formattedName.toLowerCase().includes('json') && s.formattedName.length <= 40);

  const technicalSkills = validSkills.filter((s: any) => s.category === 'Technical');
  const softSkills = validSkills.filter((s: any) => s.category === 'Soft');

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/skills'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          skill_name: newSkillName,
          category: newSkillCategory,
          level: newSkillLevel
        })
      });
      
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
        setShowModal(false);
        setNewSkillName('');
      } else {
        alert(updatedUser.error || 'Failed to add skill');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    }
    setLoading(false);
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/skills/${skillId}`), {
        method: 'DELETE'
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasResume = user.resumes && user.resumes.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Skills</h1>
          <p className="text-slate-500 text-lg">
            Track and improve your proficiency in various domains.
          </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" /> Add New Skill
        </button>
      </div>

      {!hasResume && validSkills.length === 0 && (
        <div className="p-6 bg-blue-50/60 border border-blue-200/80 rounded-3xl text-center space-y-3">
          <Award className="w-8 h-8 text-blue-600 mx-auto" />
          <h3 className="font-bold text-slate-900">No Resume Uploaded Yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Upload your resume under <strong>Resume Analyzer</strong> to automatically extract, score, and organize your technical & soft skills here.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SkillCategory title="Technical Skills" skills={technicalSkills} icon={<Zap className="w-5 h-5 text-blue-500" />} onDelete={handleDeleteSkill} />
        <SkillCategory title="Soft Skills" skills={softSkills} icon={<Award className="w-5 h-5 text-purple-500" />} onDelete={handleDeleteSkill} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative border border-slate-100">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add a New Skill</h2>
            
            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skill Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. React, TypeScript, Leadership"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select 
                  value={newSkillCategory}
                  onChange={e => setNewSkillCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="Technical">Technical</option>
                  <option value="Soft">Soft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proficiency Level</label>
                <select 
                  value={newSkillLevel}
                  onChange={e => setNewSkillLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-70"
                >
                  {loading ? 'Adding...' : 'Save Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillCategory({ title, skills, icon, onDelete }: { title: string, skills: any[], icon: React.ReactNode, onDelete: (id: string) => void }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>

      {skills.length === 0 ? (
        <p className="text-slate-500 text-sm">No skills found in this category.</p>
      ) : (
        <div className="space-y-6">
          {skills.map((s: any, i: number) => (
            <div key={s.id || i} className="space-y-2 group">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{s.formattedName || s.skill_name}</span>
                  {s.id && (
                    <button 
                      onClick={() => onDelete(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                      title="Delete skill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  s.level === 'Advanced' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                  s.level === 'Intermediate' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {s.level}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${(s.score || 50) > 70 ? 'bg-emerald-500' : (s.score || 50) > 40 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                    style={{ width: `${s.score || 50}%` }} 
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 w-8">{s.score || 50}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
