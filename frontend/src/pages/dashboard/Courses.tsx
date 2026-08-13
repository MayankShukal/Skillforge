import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { BookOpen, Star, Users, Clock, Loader2, PlayCircle, Sparkles, Filter, X, ExternalLink, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiUrl } from '../../lib/api';

interface Course {
  id: string;
  title: string;
  provider: string;
  skill: string;
  difficulty: string;
  url?: string;
  videoUrl?: string;
  isUserSkillMatch?: boolean;
  userSkillScore?: number | null;
  isSkillGap?: boolean;
}

export default function Courses() {
  const user = useStore(state => state.user);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [onlyMySkills, setOnlyMySkills] = useState(false);

  // Active Video Modal
  const [activeVideo, setActiveVideo] = useState<Course | null>(null);

  useEffect(() => {
    if (user) {
      fetch(apiUrl(`/api/courses/recommended?userId=${user.id}`))
        .then(res => res.json())
        .then(data => {
          setCourses(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Fetch courses error:", err);
          setLoading(false);
        });
    }
  }, [user]);

  if (!user) return null;

  const userSkillNames = Array.from(new Set((user.skills || []).map((s: any) => s.skill_name)));

  // Filter courses logic
  const filteredCourses = courses.filter(c => {
    // Skill filter
    if (onlyMySkills && !c.isUserSkillMatch) return false;
    if (selectedSkillFilter !== 'ALL' && c.skill.toLowerCase() !== selectedSkillFilter.toLowerCase()) return false;
    
    // Difficulty filter
    if (selectedDifficulty !== 'ALL' && c.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) return false;

    return true;
  });

  const skillGapsCount = courses.filter(c => c.isSkillGap).length;
  const mySkillsCount = courses.filter(c => c.isUserSkillMatch).length;

  // Convert youtube watch URL to embed URL
  const getEmbedUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Tailored to Your Skill Profile
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Recommended Video Courses
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Closed critical skill gaps with curated video tutorials tailored for <span className="font-semibold text-white">{user.career_goal || 'your target role'}</span>.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div className="text-center p-2">
              <p className="text-xs text-slate-400 font-medium">Total Courses</p>
              <p className="text-2xl font-bold text-white">{courses.length}</p>
            </div>
            <div className="text-center p-2 border-l border-white/10">
              <p className="text-xs text-slate-400 font-medium">Matched Skills</p>
              <p className="text-2xl font-bold text-blue-400">{mySkillsCount}</p>
            </div>
            <div className="text-center p-2 border-l border-white/10 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-400 font-medium">Priority Gaps</p>
              <p className="text-2xl font-bold text-amber-400">{skillGapsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Courses</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
              <input 
                type="checkbox" 
                checked={onlyMySkills} 
                onChange={(e) => setOnlyMySkills(e.target.checked)} 
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Show Only My Skills
            </label>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Skill Filter Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedSkillFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedSkillFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Skills ({courses.length})
            </button>

            {userSkillNames.map((skillName, idx) => {
              const count = courses.filter(c => c.skill.toLowerCase() === skillName.toLowerCase()).length;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedSkillFilter(skillName)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    selectedSkillFilter.toLowerCase() === skillName.toLowerCase()
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {skillName}
                  {count > 0 && <span className="text-[10px] opacity-75 bg-black/10 px-1.5 py-0.5 rounded-full">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Difficulty Dropdown / Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['ALL', 'Beginner', 'Intermediate', 'Advanced'].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedDifficulty(level)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedDifficulty === level
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {level === 'ALL' ? 'All Levels' : level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm font-medium">Finding best video courses for your skills...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">No courses match your filter</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Try switching filter tabs or clearing your selection to view all available video courses.
          </p>
          <button
            onClick={() => { setSelectedSkillFilter('ALL'); setSelectedDifficulty('ALL'); setOnlyMySkills(false); }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div 
              key={course.id} 
              className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative ${
                course.isSkillGap 
                  ? 'border-amber-300 ring-2 ring-amber-500/20' 
                  : course.isUserSkillMatch 
                  ? 'border-blue-200' 
                  : 'border-slate-200'
              }`}
            >
              {/* Top Banner & Badges */}
              <div>
                <div className="h-48 relative overflow-hidden bg-slate-900">
                  <img 
                    src={course.url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                  />
                  
                  {/* Overlay Video Play Icon */}
                  <div 
                    onClick={() => setActiveVideo(course)}
                    className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/10 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <div className="w-14 h-14 bg-white/90 group-hover:bg-blue-600 text-blue-600 group-hover:text-white rounded-full flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-all duration-300">
                      <PlayCircle className="w-8 h-8 fill-current stroke-[1.5]" />
                    </div>
                  </div>

                  {/* Provider Pill */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white px-3 py-1 rounded-xl text-xs font-semibold">
                    {course.provider}
                  </div>

                  {/* Skill Gap Priority Tag */}
                  {course.isSkillGap ? (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-md flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Priority Gap
                    </div>
                  ) : course.isUserSkillMatch ? (
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Skill Match
                    </div>
                  ) : null}

                  {/* Difficulty Tag at bottom right */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                    {course.difficulty}
                  </div>
                </div>

                {/* Course Details */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wider">
                      {course.skill}
                    </span>
                    {course.userSkillScore !== undefined && course.userSkillScore !== null && (
                      <span className="text-xs text-slate-400 font-medium">
                        (Your Score: {course.userSkillScore}%)
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-6">
                    <div className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      4.9
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      12k+ Students
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Video Lesson
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-0 space-y-2">
                <button
                  onClick={() => setActiveVideo(course)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" /> Watch Video Tutorial
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-800 shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white line-clamp-1">{activeVideo.title}</h3>
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                    <span>{activeVideo.provider}</span>
                    <span>•</span>
                    <span className="text-blue-400 font-semibold">{activeVideo.skill}</span>
                    <span>•</span>
                    <span>{activeVideo.difficulty}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveVideo(null)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={getEmbedUrl(activeVideo.videoUrl)}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                {activeVideo.isSkillGap ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4" /> This video addresses your priority skill gap in {activeVideo.skill}.
                  </span>
                ) : (
                  <span>Interactive Video Tutorial powered by SkillForge AI</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {activeVideo.videoUrl && (
                  <a
                    href={activeVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    Open on YouTube <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setActiveVideo(null)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Done Watching
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
