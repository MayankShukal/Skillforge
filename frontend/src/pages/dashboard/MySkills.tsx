import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Award, Zap, Plus, X } from 'lucide-react';
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

  const technicalSkills = user.skills?.filter((s: any) => s.category === 'Technical') || [];
  const softSkills = user.skills?.filter((s: any) => s.category === 'Soft') || [];

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
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Skill
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SkillCategory title="Technical Skills" skills={technicalSkills} icon={<Zap className="w-5 h-5 text-blue-500" />} />
        <SkillCategory title="Soft Skills" skills={softSkills} icon={<Award className="w-5 h-5 text-purple-500" />} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add New Skill</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddSkill} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skill Name</label>
                <input 
                  type="text" 
                  required
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  placeholder="e.g. React, Communication, Python"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setNewSkillCategory('Technical')} className={`py-2 rounded-xl font-medium text-sm border transition-colors ${newSkillCategory === 'Technical' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Technical</button>
                  <button type="button" onClick={() => setNewSkillCategory('Soft')} className={`py-2 rounded-xl font-medium text-sm border transition-colors ${newSkillCategory === 'Soft' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Soft</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proficiency Level</label>
                <select 
                  value={newSkillLevel}
                  onChange={e => setNewSkillLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillCategory({ title, skills, icon }: { title: string, skills: any[], icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>

      {skills.length === 0 ? (
        <p className="text-slate-500 text-sm">No skills found in this category.</p>
      ) : (
        <div className="space-y-6">
          {skills.map((s: any, i: number) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-800">{s.skill_name}</span>
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
