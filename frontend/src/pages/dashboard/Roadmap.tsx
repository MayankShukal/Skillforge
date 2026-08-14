import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { CheckCircle2, Clock, Loader2, RefreshCw, Sparkles, Target, PlayCircle, RotateCcw, Check, Award } from 'lucide-react';
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
  const inProgressTasks = tasks.filter((t: any) => t.status === 'In Progress').length;
  const pendingTasks = tasks.filter((t: any) => t.status === 'Pending' || !t.status).length;
  const activeTask = tasks.find((t: any) => t.status !== 'Completed');
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

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
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              <Sparkles className="w-4 h-4 text-amber-500" /> Powered by Gemini AI
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              {roadmap ? `Career Path: ${roadmap.target_role}` : 'Build Your Gemini AI Career Roadmap'}
            </h1>
            <p className="text-slate-500 text-base max-w-2xl font-medium">
              Dynamic step-by-step career path tailored to your goal. Completing steps updates your readiness score and activity streak live!
            </p>
          </div>

          <form onSubmit={generateRoadmap} className="w-full lg:w-[28rem] flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="Target role, e.g. Full Stack Developer"
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
            />
            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 shrink-0"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : roadmap ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Gemini Generating...' : roadmap ? 'Regenerate' : 'Generate Roadmap'}
            </button>
          </form>
        </div>
        
        {/* Dynamic Progress Bar & Tracking Stats */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-700 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" /> Overall Roadmap Progress
            </span>
            <span className="text-blue-600 font-extrabold text-base">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
              <p className="text-2xl font-black text-emerald-600">{completedTasks} <span className="text-slate-400 text-sm font-medium">/ {tasks.length}</span></p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">In Progress</p>
              <p className="text-2xl font-black text-blue-600">{inProgressTasks}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Remaining</p>
              <p className="text-2xl font-black text-amber-600">{pendingTasks}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-blue-900 text-xs font-bold uppercase tracking-wider mb-1">Next Action</p>
              <p className="text-xs font-bold text-blue-950 line-clamp-1">{activeTask?.title || 'Generate your plan above'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sequential Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" /> Sequential Learning Steps
          </h2>
          <span className="text-xs font-semibold text-slate-500">Live Status Tracking</span>
        </div>

        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
          {tasks.length > 0 ? tasks.map((task: any, idx: number) => {
            const isCompleted = task.status === 'Completed';
            const isInProgress = task.status === 'In Progress';

            return (
              <div key={idx} className="relative pl-8 group">
                {/* Timeline dot */}
                <div className={`absolute -left-[13px] top-1.5 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                  isCompleted ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' :
                  isInProgress ? 'bg-blue-600 ring-4 ring-blue-100' :
                  'bg-slate-300 group-hover:bg-blue-400'
                }`}>
                  {isCompleted && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>

                <div className={`p-6 rounded-2xl border transition-all space-y-3 ${
                  isCompleted ? 'bg-slate-50/80 border-slate-200/80' :
                  isInProgress ? 'bg-blue-50/30 border-blue-300 shadow-md shadow-blue-500/5' :
                  'bg-white border-slate-200 shadow-sm hover:border-blue-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      {task.milestone && (
                        <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {task.milestone}
                        </span>
                      )}
                      <h3 className={`text-lg font-extrabold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${
                        task.type === 'course' ? 'bg-blue-100 text-blue-700' : 
                        task.type === 'project' ? 'bg-purple-100 text-purple-700' : 
                        task.type === 'interview' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {task.type || 'course'}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' :
                        isInProgress ? 'bg-blue-100 text-blue-800 animate-pulse' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{task.description}</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Clock className="w-4 h-4 text-slate-400" /> Duration: {task.duration || '1-2 weeks'}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isCompleted ? (
                        <>
                          {task.status !== 'In Progress' && (
                            <button
                              onClick={() => updateTaskStatus(task.id, 'In Progress')}
                              disabled={loadingTaskId === task.id}
                              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-200"
                            >
                              <PlayCircle className="w-4 h-4 text-blue-600" /> Start Step
                            </button>
                          )}
                          <button 
                            onClick={() => updateTaskStatus(task.id, 'Completed')}
                            disabled={loadingTaskId === task.id}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-50"
                          >
                            {loadingTaskId === task.id ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                              <><CheckCircle2 className="w-4 h-4" /> Mark Complete</>
                            )}
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => updateTaskStatus(task.id, 'Pending')}
                          disabled={loadingTaskId === task.id}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                          title="Reset step to pending"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="pl-8 py-12 text-center text-slate-500">
              <Sparkles className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-base">No career roadmap generated yet.</p>
              <p className="text-xs text-slate-500 mt-1">Enter your target role above and click <strong>Generate Roadmap</strong> to build your Gemini AI plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
