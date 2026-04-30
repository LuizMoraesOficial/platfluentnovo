import { QueryClient } from '@tanstack/react-query';

// Default query function that fetches from the API
// Handles both '/api/...' and '/' prefixed keys
const defaultQueryFn = async ({ queryKey }) => {
  const key = queryKey[0];
  if (typeof key !== 'string') throw new Error('Invalid query key');

  // If key already starts with /api/, use it directly; otherwise prepend /api
  const url = key.startsWith('/api/') ? key : `/api${key}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `Request failed: ${response.status} ${response.statusText}`
      }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Enhanced API request helper
export const apiRequest = async (endpoint, options) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `Request failed: ${response.status} ${response.statusText}`
      }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
    throw new Error('Network error occurred');
  }
};

// Cache invalidation helpers
export const invalidateUserData = () => {
  queryClient.invalidateQueries({ queryKey: ['profiles'] });
  queryClient.invalidateQueries({ queryKey: ['users'] });
};

export const invalidateDashboardData = () => {
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['admin'] });
  queryClient.invalidateQueries({ queryKey: ['classes'] });
};
