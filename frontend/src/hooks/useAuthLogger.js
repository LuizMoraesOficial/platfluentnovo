import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { errorLogger } from '@/lib/errorLogger';

export function useAuthLogger() {
  const { user, profile, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (isAuthenticated && user?.id && profile?.role) {
      errorLogger.setUserContext(user.id, profile.role);
      return;
    }

    errorLogger.setUserContext(null, null);
  }, [isAuthenticated, user?.id, profile?.role, loading]);
}
