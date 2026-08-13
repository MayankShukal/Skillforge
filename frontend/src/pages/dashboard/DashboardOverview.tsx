import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Target, TrendingUp, Zap, MessageSquare, CheckCircle2, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiUrl } from '../../lib/api';

const progressData = [
  { name: 'Week 1', score: 30 },
  { name: 'Week 2', score: 45 },
  { name: 'Week 3', score: 58 },
  { name: 'Week 4', score: 68 },
];

export default function DashboardOverview() {
  const user = useStore(state => state.user);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetch(apiUrl(`/api/recommendations?userId=${user.id}`))
        .then(res => res.json())
        .then(data => setRecommendations(data));
      fetch(apiUrl(`/api/interview/prep?userId=${user.id}`))
        .then(res => res.json())
        .then(data => setQuestions(data));
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Good morning, {user.name.split(' ')[0]} </h1>
        <p className="text-slate-500 text-lg">
          Your AI career mentor has prepared today's plan to get you closer to your <span className="font-semibold text-blue-600">{user.career_goal}</span> role.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Career Readiness" value="76/100" subtitle="Getting close!" trend="+8% this month" icon={<Target className="text-blue-500" />} />
        <StatCard title="Learning Progress" value="68%" subtitle="Overall Completion" trend="+2% this week" icon={<TrendingUp className="text-emerald-500" />} />
        <StatCard title="Current Streak" value="7 Days" subtitle="On fire! 🔥" icon={<Zap className="text-amber-500" />} />
        <StatCard title="Interview Score" value="82%" subtitle="Avg across 3 mocks" icon={<MessageSquare className="text-purple-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Plan & Readiness */}
        <div className="lg:col-span-2 space-y-8">

          {/* Readiness Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Career Readiness Score</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">Placement Ready in 4 weeks</span>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" className="stroke-slate-100" strokeWidth="12" fill="none" />
                  <circle cx="80" cy="80" r="70" className="stroke-blue-600" strokeWidth="12" fill="none" strokeDasharray="440" strokeDashoffset={440 - (440 * 76) / 100} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">76</span>
                  <span className="text-sm font-medium text-slate-500">/100</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-4">
                <h4 className="font-semibold text-slate-900">What is holding you back?</h4>
                <div className="space-y-3">
                  {user.skills?.filter((s: any) => (s.score || 0) < 60).slice(0, 3).map((s: any, i: number) => (
                    <GapBar key={i} skill={s.skill_name} score={s.score || 40} />
                  )) || (
                      <GapBar skill="Machine Learning" score={42} />
                    )}
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4 text-sm flex items-start gap-2 text-blue-900">
                  <Zap className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <p><span className="font-semibold">Fastest way to improve:</span> Complete the SQL module and build one ML project. I've updated your roadmap.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Today's AI Plan</h3>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View Full Roadmap</button>
            </div>
            <div className="space-y-3">
              {user.roadmaps?.[0]?.tasks?.map((task: any, index: number) => (
                <TaskItem
                  key={task.id || index}
                  title={task.title}
                  duration={task.duration}
                  done={task.status === 'Completed'}
                />
              )) || (
                  <p className="text-slate-500 text-sm">No tasks assigned for today yet.</p>
                )}
            </div>
          </div>

        </div>

        {/* Right Column: Progress Chart & Skills */}
        <div className="space-y-8">

          {/* Progress Over Time */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Readiness Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Skill Matrix</h3>
            <div className="space-y-4">
              {user.skills?.map((s: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.skill_name}</span>
                    <span className="text-slate-500">{s.score || 50}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${(s.score || 50) > 70 ? 'bg-emerald-500' : (s.score || 50) > 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${s.score || 50}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-lg text-sm border border-slate-200 transition-colors">
              Take Skill Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations & Interview Prep */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">AI Recommendations</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="space-y-4">
            {recommendations.length > 0 ? recommendations.map((rec, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-900">{rec.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.type === 'course' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{rec.type}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">Difficulty: {rec.difficulty}</p>
                <p className="text-sm text-slate-700">"{rec.justification}"</p>
              </div>
            )) : (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">Interview Prep</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Practice Mock</button>
          </div>
          <div className="space-y-4">
            {questions.length > 0 ? questions.map((q, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex gap-2 mb-2">
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{q.category}</span>
                  <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{q.difficulty}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">Q: {q.question}</p>
                <p className="text-sm text-slate-600">A: {q.answer}</p>
              </div>
            )) : (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
                <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
          {icon}
        </div>
        {trend && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function GapBar({ skill, score }: { skill: string, score: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-slate-700">{skill}</span>
        <span className="font-bold text-red-500">{score}%</span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function TaskItem({ title, duration, done }: { title: string, duration: string, done?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${done ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="mt-0.5">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{duration}</p>
      </div>
      {!done && (
        <button className="text-slate-400 hover:text-blue-600">
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
