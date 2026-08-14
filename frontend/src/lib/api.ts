const rawUrl = import.meta.env.VITE_API_URL;
const isPlaceholder = !rawUrl || rawUrl.trim() === '' || rawUrl.includes('example.com') || rawUrl === 'https://onrender.com' || rawUrl === 'https://onrender.com/';

const defaultHost = typeof window !== 'undefined' && window.location && window.location.hostname
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : 'http://localhost:5000';

const API_BASE_URL = isPlaceholder 
  ? defaultHost 
  : rawUrl.replace(/\/+$/, '');

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

