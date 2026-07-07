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
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  staffLogin: (email: string, password: string) => api.post('/auth/staff-login', { email, password }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Menu API
export const menuApi = {
  getCategories: () => api.get('/menu/categories'),
  getCategory: (id: string) => api.get(`/menu/categories/${id}`),
  createCategory: (data: any) => api.post('/menu/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/menu/categories/${id}`),
  
  getItems: (categoryId?: string) => api.get('/menu/items', { params: { categoryId } }),
  getItem: (id: string) => api.get(`/menu/items/${id}`),
  createItem: (data: any) => api.post('/menu/items', data),
  updateItem: (id: string, data: any) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/menu/items/${id}`),
  toggleAvailability: (id: string) => api.patch(`/menu/items/${id}/toggle-availability`),
  
  getDailySpecials: () => api.get('/menu/daily-specials'),
  createDailySpecial: (data: any) => api.post('/menu/daily-specials', data),
  updateDailySpecial: (id: string, data: any) => api.put(`/menu/daily-specials/${id}`, data),
  deleteDailySpecial: (id: string) => api.delete(`/menu/daily-specials/${id}`),

  // V3 specials endpoints
  getSpecials: () => api.get('/menu/specials'),
  createSpecial: (data: any) => api.post('/menu/specials', data),
  updateSpecial: (id: string, data: any) => api.patch(`/menu/specials/${id}`, data),
  deleteSpecial: (id: string) => api.delete(`/menu/specials/${id}`),
  reorderSpecials: (items: { id: string; sortOrder: number }[]) =>
    api.patch('/menu/specials/reorder', { items }),
};

// Admin API
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: string, data: any) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  getCustomers: () => api.get('/admin/customers'),
  getCustomerOrders: (id: string) => api.get(`/admin/customers/${id}/orders`),

  getOrders: () => api.get('/admin/orders'),
  updateOrder: (id: string, data: any) => api.patch(`/admin/orders/${id}`, data),
  deleteOrder: (id: string) => api.delete(`/admin/orders/${id}`),

  getBills: () => api.get('/admin/bills'),
  updateBill: (id: string, data: any) => api.patch(`/admin/bills/${id}`, data),
  deleteBill: (id: string) => api.delete(`/admin/bills/${id}`),
};
