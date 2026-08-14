import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import { Toaster } from 'react-hot-toast';
import { apiUrl } from './lib/api';

function App() {
  useEffect(() => {
    // Non-blocking warmup ping to wake up free-tier backend instance
    fetch(apiUrl('/health')).catch(() => {});
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login initialMode="login" />} />
          <Route path="/register" element={<Login initialMode="register" />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
