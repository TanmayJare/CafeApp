import axios from 'axios';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.');
    if (isLocal) {
      return `http://${hostname}:3000/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from Zustand persisted storage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch { /* ignore parse errors */ }
  }
  return config;
});

// On 401: attempt refresh, then retry. If refresh fails, redirect to /login.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('auth-storage');
          if (raw) {
            const parsed = JSON.parse(raw);
            const refreshToken = parsed?.state?.refreshToken;
            if (refreshToken) {
              const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
              const { accessToken, refreshToken: newRefresh } = res.data;

              // Update Zustand persisted state without importing the store
              const current = JSON.parse(localStorage.getItem('auth-storage') || '{}');
              current.state = { ...current.state, token: accessToken, refreshToken: newRefresh };
              localStorage.setItem('auth-storage', JSON.stringify(current));

              original.headers.Authorization = `Bearer ${accessToken}`;
              return api(original);
            }
          }
        }
      } catch {
        // Refresh failed — clear auth and redirect
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// Made with Bob
