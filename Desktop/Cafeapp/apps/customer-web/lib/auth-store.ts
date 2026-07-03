import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  refresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: (user, token, refreshToken) => {
        set({ user, token, refreshToken: refreshToken ?? get().refreshToken });
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null });
      },

      isAuthenticated: () => {
        const state = get();
        return !!state.token && !!state.user;
      },

      // Call this from API interceptors when a 401 is received
      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const res = await api.post('/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefresh, user } = res.data;
          set({ token: accessToken, refreshToken: newRefresh, user });
          return true;
        } catch {
          set({ user: null, token: null, refreshToken: null });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);

// Made with Bob
