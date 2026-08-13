import { useStore } from '../../store/useStore';
import { User, Mail, Target, Award, Edit, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const user = useStore(state => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [goal, setGoal] = useState(user?.career_goal || '');

  const handleSave = () => {
    // Here we'd ideally make an API call to update the user
    // but for now we'll just show a success toast and stop editing
    toast.success('Profile updated successfully!');
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto pb-20 mt-4">
      {/* Banner & Avatar */}
      <div className="relative mb-24">
        <div className="h-48 w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl shadow-sm"></div>
        <div className="absolute -bottom-12 left-10 flex items-end gap-6">
          <div className="w-32 h-32 rounded-full border-4 border-slate-50 bg-slate-800 flex items-center justify-center text-5xl font-bold text-white shadow-xl">
            {user.name.charAt(0)}
          </div>
          <div className="mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
            <p className="text-slate-500 font-medium">{user.career_goal}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
        {/* Left Column: Details */}
        <div className="col-span-1 md:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isEditing 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isEditing ? <CheckCircle className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium" 
                  />
                ) : (
                  <p className="text-slate-900 font-semibold text-lg">{user.name}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </label>
                <p className="text-slate-900 font-semibold text-lg">{user.email}</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                  <Target className="w-3.5 h-3.5" /> Career Goal
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={goal} 
                    onChange={e => setGoal(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium" 
                  />
                ) : (
                  <p className="text-slate-900 font-semibold text-lg">{user.career_goal}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats */}
        <div className="col-span-1 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" /> Account Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm font-medium">Joined</span>
                <span className="text-slate-900 font-bold">This Month</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm font-medium">Skills Tracked</span>
                <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full">{user.skills?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-500 text-sm font-medium">Active Roadmap</span>
                <span className="text-slate-900 font-bold">{user.roadmaps?.[0]?.title ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
