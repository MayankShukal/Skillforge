const rawUrl = (import.meta.env.VITE_API_URL || '').trim();

function getApiBaseUrl(): string {
  // If explicitly configured with a valid URL, use it
  if (rawUrl && !rawUrl.includes('example.com') && rawUrl !== 'https://onrender.com' && rawUrl !== 'https://onrender.com/') {
    return rawUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    
    // Local development: connect to backend port 5000
    if (isLocal) {
      return `${protocol}//${hostname}:5000`;
    }

    // Render deployment automatic pairing:
    // If frontend is named "xxx-frontend.onrender.com", automatically match "xxx-backend.onrender.com"
    if (hostname.includes('-frontend.onrender.com')) {
      const backendHost = hostname.replace('-frontend.onrender.com', '-backend.onrender.com');
      return `${protocol}//${backendHost}`;
    }
    if (hostname.includes('-client.onrender.com')) {
      const backendHost = hostname.replace('-client.onrender.com', '-server.onrender.com');
      return `${protocol}//${backendHost}`;
    }
    if (hostname.includes('-ui.onrender.com')) {
      const backendHost = hostname.replace('-ui.onrender.com', '-api.onrender.com');
      return `${protocol}//${backendHost}`;
    }

    // Default to same-origin (relative path for full-stack service or reverse proxy)
    return '';
  }

  return 'http://localhost:5000';
}

const API_BASE_URL = getApiBaseUrl();

export function apiUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

