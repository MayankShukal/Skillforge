const rawUrl = import.meta.env.VITE_API_URL;
const isPlaceholder = !rawUrl || rawUrl.trim() === '' || rawUrl.includes('example.com') || rawUrl === 'https://onrender.com' || rawUrl === 'https://onrender.com/';

const API_BASE_URL = isPlaceholder 
  ? 'http://localhost:5000' 
  : rawUrl.replace(/\/+$/, '');

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

