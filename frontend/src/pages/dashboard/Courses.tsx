import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { BookOpen, Star, Users, Clock, Loader2 } from 'lucide-react';
import { apiUrl } from '../../lib/api';

export default function Courses() {
  const user = useStore(state => state.user);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(apiUrl(`/api/courses/recommended?userId=${user.id}`))
        .then(res => res.json())
        .then(data => {
          setCourses(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Recommended Courses</h1>
          <p className="text-slate-500 text-lg">
            Curated resources to help you close your skill gaps.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No courses found</h2>
          <p className="text-slate-500 max-w-md mx-auto">We couldn't find any courses matching your skills right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="h-48 relative overflow-hidden">
                <img src={course.url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800">
                  {course.provider}
                </div>
                <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-white">
                  {course.difficulty}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">{course.title}</h3>
                <p className="text-xs font-semibold text-blue-600 mb-3">{course.skill}</p>
                
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-5">
                  <div className="flex items-center gap-1 font-medium text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                    4.8
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    10k+
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    20 hrs
                  </div>
                </div>

                <a 
                  href={course.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(course.title + ' tutorial course')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center w-full bg-slate-50 hover:bg-blue-600 text-slate-700 hover:text-white py-2.5 rounded-xl font-medium transition-colors border border-slate-200 hover:border-transparent"
                >
                  Start Watching
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
