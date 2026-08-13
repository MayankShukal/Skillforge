import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { GitBranch, ExternalLink, Code2, Plus, X, Loader2 } from 'lucide-react';
import { apiUrl } from '../../lib/api';

export default function Projects() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [tech, setTech] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!user) return null;

  const projects = user.projects || [];

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title,
          technologies: tech
        })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
        setShowModal(false);
        setTitle('');
        setTech('');
      } else {
        alert(updatedUser.error || 'Failed to add project');
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const updateProgress = async (id: string, newProgress: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(apiUrl(`/api/projects/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, progress: newProgress, status: newStatus })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error(error);
    }
    setUpdatingId(null);
  };

  const handleRepoClick = async (title: string) => {
    const formattedName = title.replace(/\s+/g, '-');
    try {
      const res = await fetch(`https://api.github.com/repos/mayankshukal7890/${formattedName}`);
      if (res.ok) {
        // Repo exists, open it directly
        window.open(`https://github.com/mayankshukal7890/${formattedName}`, '_blank');
      } else {
        // Repo does not exist, open the creation page
        window.open(`https://github.com/new?name=${encodeURIComponent(formattedName)}`, '_blank');
      }
    } catch {
      // Fallback
      window.open(`https://github.com/new?name=${encodeURIComponent(formattedName)}`, '_blank');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Projects Portfolio</h1>
          <p className="text-slate-500 text-lg">
            Build real-world applications to stand out to employers.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <Code2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No projects yet</h2>
          <p className="text-slate-500 max-w-md mx-auto">Start building your portfolio by adding a project you are working on or planning to build.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p: any) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-shadow flex flex-col relative">
              {updatingId === p.id && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Code2 className="w-6 h-6" />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 
                  p.status === 'In Progress' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {p.status}
                </span>
              </div>
              
              <h3 className="font-bold text-xl text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-500 mb-6">{p.technologies}</p>
              
              <div className="mt-auto space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-700">
                  <span>Progress</span>
                  <span>{p.progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${p.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                    style={{ width: `${p.progress}%` }} 
                  />
                </div>
                
                {p.status !== 'Completed' && (
                  <div className="flex gap-2 pt-2">
                    {p.status === 'To Do' ? (
                      <button 
                        onClick={() => updateProgress(p.id, 10, 'In Progress')}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg font-medium text-sm transition-colors"
                      >
                        Start Project
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateProgress(p.id, Math.min(p.progress + 20, 100), p.progress + 20 >= 100 ? 'Completed' : 'In Progress')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                      >
                        {p.progress + 20 >= 100 ? 'Complete Project' : 'Update Progress (+20%)'}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => handleRepoClick(p.title)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors text-sm"
                  >
                    <GitBranch className="w-4 h-4" /> Repo
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors text-sm">
                    <ExternalLink className="w-4 h-4" /> Live
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. E-Commerce Backend"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Technologies Used</label>
                <input 
                  type="text" 
                  required
                  value={tech}
                  onChange={e => setTech(e.target.value)}
                  placeholder="e.g. React, Node.js, PostgreSQL"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
