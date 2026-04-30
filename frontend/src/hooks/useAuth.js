import { useState, useEffect, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      // Always verify with server first — localStorage is only a fallback for network errors
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = await response.json();
          if (data.user && data.profile) {
            setUser(data.user);
            setProfile(data.profile);
            // Always overwrite localStorage with fresh server data
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('profile', JSON.stringify(data.profile));
            setLoading(false);
            return;
          }
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
        }
      }

      // Server returned 401/403 — session is invalid, clear stale localStorage
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // If authentication fails or the session is invalid, clear stale auth data.
      localStorage.removeItem('user');
      localStorage.removeItem('profile');
      setUser(null);
      setProfile(null);
      errorLogger.setUserContext(null, null);
    } catch (error) {
      console.error('Error checking auth status:', error);
      // On network error, keep the client unauthenticated until a valid server session can be confirmed.
      localStorage.removeItem('user');
      localStorage.removeItem('profile');
      setUser(null);
      setProfile(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const signIn = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data = null;
      const bodyText = await response.text();
      if (bodyText) {
        try {
          data = JSON.parse(bodyText);
        } catch (parseError) {
          console.error('Failed to parse login response:', parseError, bodyText);
        }
      }

      if (!response.ok) {
        const message = data?.message || response.statusText || 'Login failed';
        return { data: null, error: { message } };
      }

      if (data?.user && data?.profile) {
        setUser(data.user);
        setProfile(data.profile);
        setLoading(false);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('profile', JSON.stringify(data.profile));
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message || 'Login failed' } };
    }
  };

  const signUp = async (username, password, fullName, email, role = 'student') => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password, 
          full_name: fullName, 
          email, 
          role 
        }),
      });

      let data = null;
      const bodyText = await response.text();
      if (bodyText) {
        try {
          data = JSON.parse(bodyText);
        } catch (parseError) {
          console.error('Failed to parse registration response:', parseError, bodyText);
        }
      }

      if (!response.ok) {
        const message = data?.message || response.statusText || 'Registration failed';
        return { data: null, error: { message, errors: data?.errors } };
      }

      if (data?.user && data?.profile) {
        setUser(data.user);
        setProfile(data.profile);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('profile', JSON.stringify(data.profile));
        errorLogger.setUserContext(data.user.id, data.profile.role);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message || 'Registration failed' } };
    }
  };

  const signOut = async () => {
    try {
      // Call logout endpoint to destroy server session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error calling logout endpoint:', error);
    }
    
    // Always clear local state regardless of server response
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    localStorage.removeItem('vite-ui-theme');
    errorLogger.setUserContext(null, null);
    
    // Clear React Query cached state
    queryClient.clear();
    
    // Force full page reload to landing page
    window.location.replace('/');
  };

  return {
    user,
    session: user ? { user } : null,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    checkAuthStatus,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
  };
}
