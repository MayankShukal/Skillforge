import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle2, Clock, ArrowRight, Loader2, RefreshCw, Sparkles, Target, PlayCircle } from 'lucide-react';
import { apiUrl } from '../../lib/api';

export default function Roadmap() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState(user?.career_goal || '');
  const [generating, setGenerating] = useState(false);

  if (!user) return null;

  const roadmap = user.roadmaps?.[0];
  const tasks = roadmap?.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === 'Completed').length;
  const activeTask = tasks.find((t: any) => t.status !== 'Completed');

  const generateRoadmap = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const role = targetRole.trim() || user.career_goal || 'Software Engineer';

    setGenerating(true);
    try {
      const res = await fetch(apiUrl('/api/roadmap/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, targetRole: role })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
      } else {
        alert(updatedUser.error || 'Failed to generate roadmap');
      }
    } catch (error) {
      console.error(error);
      alert('Could not connect to the roadmap generator');
    } finally {
      setGenerating(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    setLoadingTaskId(taskId);
    try {
      const res = await fetch(apiUrl(`/api/roadmap/task/${taskId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId: user.id })
      });
      const updatedUser = await res.json();
      if (res.ok) {
        setUser(updatedUser);
      } else {
        alert(updatedUser.error || 'Failed to update task');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoadingTaskId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-2">
              <Target className="w-4 h-4" />
              Career Roadmap
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {roadmap ? `Path to ${roadmap.target_role}` : 'Build your personalized career plan'}
            </h1>
            <p className="text-slate-500 text-base max-w-2xl">
              Generate a focused plan, finish the active step, then ask your AI mentor for help when you get stuck.
            </p>
          </div>

          <form onSubmit={generateRoadmap} className="w-full lg:w-[28rem] flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="Target role, e.g. Full Stack Developer"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : roadmap ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {roadmap ? 'Regenerate' : 'Generate'}
            </button>
          </form>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-slate-500 text-sm font-medium mb-1">Progress</p>
            <p className="text-2xl font-bold text-slate-900">{roadmap?.progress || 0}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-slate-500 text-sm font-medium mb-1">Tasks Completed</p>
            <p className="text-2xl font-bold text-slate-900">
              {completedTasks} <span className="text-slate-400 text-lg">/ {tasks.length}</span>
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-blue-700 text-sm font-medium mb-1">Next Best Action</p>
            <p className="text-sm font-semibold text-blue-950 line-clamp-2">{activeTask?.title || 'Generate a roadmap to get your first step'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
          {tasks.length > 0 ? tasks.map((task: any, idx: number) => (
            <div key={idx} className="relative pl-8 group">
              {/* Timeline dot */}
              <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center ${
                task.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-300 group-hover:bg-blue-400 transition-colors'
              }`}>
                {task.status === 'Completed' && <CheckCircle2 className="w-3 h-3 text-white absolute" />}
              </div>

              <div className={`p-5 rounded-2xl border transition-all ${
                task.status === 'Completed' ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`text-lg font-bold ${task.status === 'Completed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                    {task.title}
                  </h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    task.type === 'course' ? 'bg-blue-50 text-blue-700' : 
                    task.type === 'project' ? 'bg-purple-50 text-purple-700' : 
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {task.type}
                  </span>
                </div>
                
                <p className="text-slate-600 mb-4">{task.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Clock className="w-4 h-4" />
                    {task.duration}
                  </div>
                  
                  {task.status !== 'Completed' && (
                    <div className="flex items-center gap-3">
                      {task.status === 'Pending' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'In Progress')}
                          disabled={loadingTaskId === task.id}
                          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          <PlayCircle className="w-4 h-4" /> Start
                        </button>
                      )}
                      <button 
                        onClick={() => updateTaskStatus(task.id, 'Completed')}
                        disabled={loadingTaskId === task.id}
                        className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 group-hover:translate-x-1 transition-transform disabled:opacity-50 disabled:group-hover:translate-x-0"
                      >
                        {loadingTaskId === task.id ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                          <>Complete <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="pl-8 py-8 text-center text-slate-500">
              No roadmap tasks yet. Enter your target role above and generate your plan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
