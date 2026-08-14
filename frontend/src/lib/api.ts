const rawEnvUrl = (import.meta.env.VITE_API_URL || '').trim();

function getApiBaseUrl(): string {
  // 1. Check for runtime custom API URL override in localStorage (if set)
  if (typeof window !== 'undefined') {
    try {
      const customUrl = localStorage.getItem('skillforce_api_url');
      if (customUrl && customUrl.trim()) {
        let clean = customUrl.trim().replace(/\/+$/, '');
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `https://${clean}`;
        }
        return clean;
      }
    } catch {}
  }

  // 2. If VITE_API_URL is provided and not a dummy placeholder
  if (rawEnvUrl && !rawEnvUrl.includes('example.com') && rawEnvUrl !== 'https://onrender.com' && rawEnvUrl !== 'https://onrender.com/') {
    let clean = rawEnvUrl.replace(/\/+$/, '');
    // Render "property: host" provides host without protocol (e.g. skillforce-backend.onrender.com)
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  // 3. Dynamic browser hostname resolution
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    
    // Local development: connect to backend port 5000
    if (isLocal) {
      return `${protocol}//${hostname}:5000`;
    }

    // Render deployment automatic pairing:
    // If frontend is named "xxx-frontend.onrender.com", automatically target "xxx-backend.onrender.com"
    if (hostname.includes('-frontend.onrender.com')) {
      const backendHost = hostname.replace('-frontend.onrender.com', '-backend.onrender.com');
      return `https://${backendHost}`;
    }
    if (hostname.includes('-client.onrender.com')) {
      const backendHost = hostname.replace('-client.onrender.com', '-server.onrender.com');
      return `https://${backendHost}`;
    }
    if (hostname.includes('-ui.onrender.com')) {
      const backendHost = hostname.replace('-ui.onrender.com', '-api.onrender.com');
      return `https://${backendHost}`;
    }

    // Default to same origin (relative /api path for full-stack service)
    return '';
  }

  return 'http://localhost:5000';
}

const API_BASE_URL = getApiBaseUrl();

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

export function getBaseApiUrl(): string {
  return API_BASE_URL;
}

