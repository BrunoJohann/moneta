const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('moneta_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return fetchApi<T>(endpoint, options);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('moneta_token');
      localStorage.removeItem('moneta_refresh_token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('moneta_refresh_token') : null;
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem('moneta_token', data.accessToken);
    localStorage.setItem('moneta_refresh_token', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// --- Types ---

export interface User {
  id: string;
  email: string;
  name?: string;
  currency?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  count: number;
}

export interface WeeklyTotal {
  week: string;
  income: number;
  expenses: number;
}

export interface GoalForecast {
  predictedDate: string;
  onTrack: boolean;
  daysRemaining: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  forecast?: GoalForecast;
  createdAt: string;
}

export interface AiInsight {
  id: string;
  type: 'DAILY_SUMMARY' | 'SPENDING_ALERT' | 'FORECAST' | 'TIP';
  content: string;
  metadata?: Record<string, unknown>;
  sentViaWhatsapp: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  amount?: number;
  dueDate: string;
  recurring?: boolean;
  frequency?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

export type MessageStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ParsedAction {
  type: 'expense' | 'income' | 'goal' | 'reminder';
  amount?: number;
  category?: string;
  date?: string;
  description?: string;
  transactionId?: string;
}

export interface Message {
  id: string;
  text: string;
  response: string;
  status: MessageStatus;
  parsedAction?: ParsedAction;
}

export interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface Forecast {
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardSummary {
  summary: TransactionSummary;
  forecast: Forecast;
}

// --- API Namespaces ---

const auth = {
  login(email: string) {
    return fetchApi<{ message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verify(email: string, code: string) {
    const data = await fetchApi<AuthTokens>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    localStorage.setItem('moneta_token', data.accessToken);
    localStorage.setItem('moneta_refresh_token', data.refreshToken);
    document.cookie = 'moneta_session=true; path=/; max-age=604800; SameSite=Lax';
    return data;
  },

  async logout() {
    try {
      await fetchApi<void>('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('moneta_token');
      localStorage.removeItem('moneta_refresh_token');
      document.cookie = 'moneta_session=; path=/; max-age=0';
    }
  },
};

const messages = {
  send(text: string, idempotencyKey: string) {
    return fetchApi<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ text, idempotencyKey }),
    });
  },

  getById(id: string) {
    return fetchApi<Message>(`/messages/${id}`);
  },
};

const transactions = {
  list(params?: TransactionListParams) {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return fetchApi<PaginatedResponse<Transaction>>(`/transactions${query}`);
  },

  getSummary(year: number, month: number) {
    return fetchApi<TransactionSummary>(`/transactions/summary?year=${year}&month=${month}`);
  },

  getCategoryBreakdown(year: number, month: number) {
    return fetchApi<CategoryBreakdown[]>(`/transactions/categories?year=${year}&month=${month}`);
  },

  getWeeklyTotals(year: number, month: number) {
    return fetchApi<WeeklyTotal[]>(`/transactions/weekly?year=${year}&month=${month}`);
  },

  create(data: Omit<Transaction, 'id' | 'createdAt'>) {
    return fetchApi<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
    return fetchApi<Transaction>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return fetchApi<void>(`/transactions/${id}`, { method: 'DELETE' });
  },
};

const goals = {
  list() {
    return fetchApi<Goal[]>('/goals');
  },

  create(data: { title: string; targetAmount: number; deadline?: string }) {
    return fetchApi<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Omit<Goal, 'id' | 'createdAt'>>) {
    return fetchApi<Goal>(`/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  addProgress(id: string, amount: number) {
    return fetchApi<Goal>(`/goals/${id}/progress`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  delete(id: string) {
    return fetchApi<void>(`/goals/${id}`, { method: 'DELETE' });
  },
};

const reminders = {
  list() {
    return fetchApi<Reminder[]>('/reminders');
  },

  create(data: Omit<Reminder, 'id' | 'createdAt'>) {
    return fetchApi<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

const categories = {
  list() {
    return fetchApi<Category[]>('/categories');
  },
};

const insights = {
  list(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const query = params.toString();
    return fetchApi<AiInsight[]>(`/insights${query ? `?${query}` : ''}`);
  },

  latest() {
    return fetchApi<AiInsight>('/insights/latest');
  },
};

const users = {
  me() {
    return fetchApi<User>('/users/me');
  },

  update(data: Partial<Pick<User, 'name' | 'currency'>>) {
    return fetchApi<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

const forecast = {
  get() {
    return fetchApi<Forecast>('/forecast');
  },
};

const dashboard = {
  async summary(): Promise<DashboardSummary> {
    const now = new Date();
    const [summary, forecastData] = await Promise.all([
      transactions.getSummary(now.getFullYear(), now.getMonth() + 1),
      forecast.get(),
    ]);
    return { summary, forecast: forecastData };
  },
};

export const api = {
  auth,
  messages,
  transactions,
  goals,
  reminders,
  categories,
  insights,
  users,
  forecast,
  dashboard,
};
