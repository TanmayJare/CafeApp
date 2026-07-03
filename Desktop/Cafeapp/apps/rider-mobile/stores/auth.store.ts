import { create } from 'zustand';
import { Platform } from 'react-native';
import api from '../lib/api';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); return; }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); return; }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

interface AuthUser { id: string; email: string; name: string | null; role: string; }
interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  login: (accessToken: string, user: AuthUser, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (accessToken, user, refreshToken) => {
    await storage.setItem('accessToken', accessToken);
    if (refreshToken) await storage.setItem('refreshToken', refreshToken);
    set({ user });
  },

  logout: async () => {
    await storage.deleteItem('accessToken');
    await storage.deleteItem('refreshToken');
    set({ user: null });
  },

  hydrate: async () => {
    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;
      const res = await api.get('/auth/me');
      set({ user: res.data });
    } catch {
      await storage.deleteItem('accessToken');
    } finally {
      set({ isLoading: false });
    }
  },
}));
