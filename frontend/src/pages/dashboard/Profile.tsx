import { useStore } from '../../store/useStore';
import { User, Mail, Target, Award, Edit, CheckCircle, GraduationCap, BookOpen, Calendar, FileText, Code, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiUrl } from '../../lib/api';

export default function Profile() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [goal, setGoal] = useState(user?.career_goal || '');
  const [college, setCollege] = useState(user?.college || '');
  const [degree, setDegree] = useState(user?.degree || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [graduationYear, setGraduationYear] = useState(user?.graduation_year?.toString() || '');

  const latestResume = user?.resumes?.[0];

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const response = await fetch(apiUrl(`/api/user/${user.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          career_goal: goal.trim(),
          college: college.trim(),
          degree: degree.trim(),
          branch: branch.trim(),
          graduation_year: graduationYear.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      toast.success('Profile details updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error('Failed to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20 mt-4 space-y-8">
      {/* Banner & Avatar Header */}
      <div className="relative mb-20">
        <div className="h-52 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
        </div>

        <div className="absolute -bottom-12 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-end gap-5">
            <div className="w-28 h-28 rounded-2xl border-4 border-slate-50 bg-slate-900 flex items-center justify-center text-4xl font-bold text-white shadow-xl tracking-wider">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
              <p className="text-slate-500 font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                {user.career_goal || 'Career Goal Not Set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {latestResume && (
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <Award className="w-4 h-4" />
                <span>ATS Resume Score: {latestResume.resume_score || 85}%</span>
              </div>
            )}

            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                isEditing
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isEditing ? <CheckCircle className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
        {/* Left 2 Columns: Personal, Academic, and Resume Sections */}
        <div className="col-span-1 md:col-span-2 space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> Personal Information
              </h2>
              {isEditing && <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Editing Active</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                ) : (
                  <p className="text-slate-900 font-bold text-lg">{user.name}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  Email Address
                </label>
                <p className="text-slate-900 font-semibold text-lg flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" /> {user.email}
                </p>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  Target Career Goal
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    placeholder="e.g. Full Stack Engineer, Data Scientist, ML Engineer"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                ) : (
                  <p className="text-slate-900 font-bold text-lg">{user.career_goal || 'Not specified'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Academic & Education Background */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" /> Academic & Education Details
              </h2>
              <span className="text-xs font-medium text-slate-400">Extracted from Resume / Profile</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  College / University
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={college}
                    onChange={e => setCollege(e.target.value)}
                    placeholder="e.g. Stanford University, IIT Delhi"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                ) : (
                  <p className="text-slate-900 font-bold text-lg">{user.college || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  Degree Program
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={degree}
                    onChange={e => setDegree(e.target.value)}
                    placeholder="e.g. B.Tech, M.S., BCA"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                ) : (
                  <p className="text-slate-900 font-bold text-lg flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" /> {user.degree || 'Not specified'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  Branch / Major
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    placeholder="e.g. Computer Science, Artificial Intelligence"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                ) : (
                  <p className="text-slate-900 font-bold text-lg">{user.branch || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  Graduation Year
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={graduationYear}
                    onChange={e => setGraduationYear(e.target.value)}
                    placeholder="e.g. 2026"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                ) : (
                  <p className="text-slate-900 font-bold text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" /> {user.graduation_year || 'Not specified'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Extracted Resume Details & Projects */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" /> Resume & Extracted Highlights
              </h2>
              {latestResume && (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Uploaded File
                </span>
              )}
            </div>

            {/* Extracted Skills & Progress */}
            {!latestResume ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Resume Uploaded</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload your resume under <strong>Resume Analyzer</strong> to extract verified skills, calculate ATS scores, and generate your career progress tracking.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                    <Code className="w-4 h-4 text-blue-600" /> Skills Extracted From Resume ({user.skills?.length || 0})
                  </h3>
                  {user.skills && user.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.skills
                        .map((skill: any) => ({
                          ...skill,
                          formattedName: (typeof skill.skill_name === 'string' ? skill.skill_name : String(skill.skill_name || '')).replace(/[{}"'`]/g, '').trim()
                        }))
                        .filter((skill: any) => skill.formattedName && !skill.formattedName.toLowerCase().includes('json') && skill.formattedName.length <= 40)
                        .map((skill: any, idx: number) => (
                          <span
                            key={skill.id || idx}
                            className="px-3.5 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200/60"
                          >
                            {skill.formattedName}
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold uppercase">
                              {skill.level || 'Verified'}
                            </span>
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No skills extracted from resume yet.</p>
                  )}
                </div>

                {/* Extracted Projects */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                    <Briefcase className="w-4 h-4 text-emerald-600" /> Portfolio Projects ({user.projects?.length || 0})
                  </h3>
                  {user.projects && user.projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {user.projects.map((proj: any, idx: number) => (
                        <div key={proj.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                          <h4 className="font-bold text-slate-900 text-sm mb-1">{proj.title}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2 mb-2">{proj.description}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">{proj.technologies}</span>
                            <span>{proj.progress || 0}% Complete</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No projects listed yet. Add projects under the Projects tab.</p>
                  )}
                </div>
              </>
            )}

            {/* Raw Extracted Resume Text Toggle */}
            {latestResume?.extracted_text && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showRawText ? 'Hide Extracted Resume Text' : 'View Extracted Resume Text Snippet'}
                </button>
                {showRawText && (
                  <div className="mt-3 p-4 bg-slate-900 text-slate-300 rounded-2xl text-xs font-mono max-h-60 overflow-y-auto leading-relaxed border border-slate-800">
                    {latestResume.extracted_text}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profile Stats & Completeness */}
        <div className="col-span-1 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-blue-600" /> Account Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm font-medium">College</span>
                <span className="text-slate-900 font-bold text-xs truncate max-w-[140px]">{user.college || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm font-medium">Degree</span>
                <span className="text-slate-900 font-bold text-xs">{user.degree || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm font-medium">Branch</span>
                <span className="text-slate-900 font-bold text-xs truncate max-w-[140px]">{user.branch || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm font-medium">Graduation</span>
                <span className="text-slate-900 font-bold text-xs">{user.graduation_year || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm font-medium">Skills Tracked</span>
                <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full text-xs">{user.skills?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-500 text-sm font-medium">Active Roadmap</span>
                <span className="text-slate-900 font-bold text-xs">{user.roadmaps?.[0]?.target_role ? 'Active' : 'Not Generated'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
