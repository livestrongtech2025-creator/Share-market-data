import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token') || localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token');
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('nse-auth');
        } catch {}
        const url = error.config?.url || '';
        if (!url.includes('/auth/login')) {
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) => api.post('/auth/register', { email, password, name }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Market Data
export const marketApi = {
  getLowerBandHitters: (params?: any) => api.get('/lower-band-hitters', { params }),
  getUpperBandHitters: (params?: any) => api.get('/upper-band-hitters', { params }),
  getVolumeGainers: (params?: any) => api.get('/volume-gainers', { params }),
  getMostActiveEquities: (params?: any) => api.get('/most-active-equities', { params }),
  getBhavCopy: (params?: any) => api.get('/bhav-copy', { params }),
  getBhavCopySeries: () => api.get('/bhav-copy-series'),
  getAvailableDates: (table: string) => api.get(`/available-dates/${table}`),
  exportCsv: (table: string, date: string) =>
    api.get(`/export/${table}?date=${date}`, { responseType: 'blob' }),
};

// AI
export const aiApi = {
  getMarketSummary: (date?: string) => api.get('/ai/market-summary', { params: date ? { date } : {} }),
  getStockInsights: (params?: any) => api.get('/ai/stock-insights', { params }),
  getStockInsight: (symbol: string, date?: string) => api.get(`/ai/stock-insights/${symbol}`, { params: date ? { date } : {} }),
  getSignals: (params?: any) => api.get('/ai/signals', { params }),
  getAlerts: (params?: any) => api.get('/ai/alerts', { params }),
  getUnreadCount: () => api.get('/ai/alerts/unread-count'),
  markAlertRead: (id: string) => api.post(`/ai/alerts/${id}/read`),
  getWatchlistAlerts: (params?: any) => api.get('/ai/watchlist-alerts', { params }),
};

// Watchlist
export const watchlistApi = {
  getWatchlists: () => api.get('/watchlists'),
  create: (name: string, description?: string) => api.post('/watchlists', { name, description }),
  addSymbol: (id: string, symbol: string) => api.post(`/watchlists/${id}/symbols`, { symbol }),
  removeSymbol: (id: string, symbol: string) => api.delete(`/watchlists/${id}/symbols/${symbol}`),
  delete: (id: string) => api.delete(`/watchlists/${id}`),
};

// Logs
export const logsApi = {
  getLogs: (params?: any) => api.get('/logs', { params }),
  getStats: () => api.get('/logs/stats'),
};

// Admin
export const adminApi = {
  triggerIngestion: (date?: string) => api.post('/admin/trigger-ingestion', date ? { date } : {}),
};

// AI Service — routes to NestJS backend (not Python service)
// The chat endpoint is handled by the ChatService in the NestJS backend
export const aiServiceApi = {
  getStockIndicators: (symbol: string, days?: number) =>
    api.get(`/ai/stock-insights/${symbol}`, { params: days ? { days } : {} }),
  getMarketBreadth: (date?: string) =>
    api.get('/ai/market-summary', { params: date ? { date } : {} }),
  getTopSignals: (date?: string, limit?: number) =>
    api.get('/ai/signals', { params: { date, limit } }),
  getSectorAnalysis: (date?: string) =>
    api.get('/ai/market-summary', { params: date ? { date } : {} }),
  getHistorical: (symbol: string, days?: number) =>
    api.get(`/ai/stock-insights/${symbol}`, { params: days ? { days } : {} }),
  chat: (message: string, history?: any[]) =>
    api.post('/ai/chat/ask', { message, history }),
};

