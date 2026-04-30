import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { errorLogger } from '@/lib/errorLogger';
import { useAuth } from '@/hooks/useAuth';

export function useAuthWithErrorHandling(options = {}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [authError, setAuthError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastRecoveryAttempt, setLastRecoveryAttempt] = useState(null);

  const defaultOptions = {
    maxRetries: 3,
    autoRetry: true,
    silentRefresh: true,
    redirectOnFailure: true,
    ...options,
  };

  const classifyAuthError = (error) => {
    const message = error.message.toLowerCase();
    
    if (message.includes('session expired') || message.includes('unauthorized')) {
      return {
        type: 'session_expired',
        message: 'Sua sessão expirou. Faça login novamente.',
        shouldRetry: true,
        retryDelay: 1000,
      };
    }
    
    if (message.includes('invalid credentials') || message.includes('forbidden')) {
      return {
        type: 'invalid_credentials',
        message: 'Credenciais inválidas. Verifique seus dados.',
        shouldRetry: false,
      };
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return {
        type: 'network_error',
        message: 'Problema de conexão. Verificando conectividade...',
        shouldRetry: true,
        retryDelay: 2000,
      };
    }
    
    if (message.includes('http 5') || message.includes('server error')) {
      return {
        type: 'server_error',
        message: 'Erro do servidor. Tentando novamente...',
        shouldRetry: true,
        retryDelay: 5000,
      };
    }
    
    if (message.includes('permission denied') || message.includes('access denied')) {
      return {
        type: 'permission_denied',
        message: 'Acesso negado para esta funcionalidade.',
        shouldRetry: false,
      };
    }
    
    return {
      type: 'server_error',
      message: 'Erro de autenticação inesperado.',
      shouldRetry: true,
      retryDelay: 3000,
    };
  };

  const logAuthError = (error, context = {}) => {
    errorLogger.logAuthError(
      `Authentication error: ${error.type}`,
      {
        component: 'useAuthWithErrorHandling',
        action: 'auth_error',
      },
      {
        errorType: error.type,
        message: error.message,
        shouldRetry: error.shouldRetry,
        retryCount,
        maxRetries: defaultOptions.maxRetries,
        userId: auth.user?.id,
        userRole: auth.profile?.role,
        ...context,
      }
    );
  };

  const attemptSessionRecovery = useCallback(async () => {
    if (isRecovering) {
      return false;
    }

    setIsRecovering(true);
    setLastRecoveryAttempt(Date.now());

    try {
      errorLogger.logAuthError(
        'Attempting session recovery',
        {
          component: 'useAuthWithErrorHandling',
          action: 'session_recovery_attempt',
        },
        {
          retryCount,
          maxRetries: defaultOptions.maxRetries,
          lastAttempt: lastRecoveryAttempt,
        }
      );

      // Try to refresh the session by checking auth status
      await auth.checkAuthStatus();
      
      if (auth.isAuthenticated) {
        errorLogger.logAuthError(
          'Session recovery successful',
          {
            component: 'useAuthWithErrorHandling',
            action: 'session_recovery_success',
          },
          {
            retryCount,
            userId: auth.user?.id,
            userRole: auth.profile?.role,
          }
        );

        setAuthError(null);
        setRetryCount(0);
        setIsRecovering(false);
        
        if (defaultOptions.silentRefresh) {
          toast({
            title: "Sessão restaurada",
            description: "Sua sessão foi restaurada automaticamente.",
          });
        }
        
        return true;
      }

      throw new Error('Session recovery failed - user not authenticated');
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      errorLogger.logAuthError(
        'Session recovery failed',
        {
          component: 'useAuthWithErrorHandling',
          action: 'session_recovery_failed',
        },
        {
          error: err.message,
          retryCount,
          maxRetries: defaultOptions.maxRetries,
        }
      );

      setIsRecovering(false);
      return false;
    }
  }, [auth, isRecovering, retryCount, defaultOptions, toast, lastRecoveryAttempt]);

  const handleAuthError = useCallback(async (error, context = {}) => {
    const authError = classifyAuthError(error);
    setAuthError(authError);
    
    logAuthError(authError, context);

    // Show user feedback for critical errors
    if (authError.type === 'session_expired' || authError.type === 'invalid_credentials') {
      toast({
        title: "Problema de autenticação",
        description: authError.message,
        variant: "destructive",
      });
    }

    // Handle automatic retry for recoverable errors
    if (authError.shouldRetry && defaultOptions.autoRetry && retryCount < defaultOptions.maxRetries) {
      const delay = authError.retryDelay || 2000;
      
      setRetryCount(prev => prev + 1);
      
      setTimeout(async () => {
        const recovered = await attemptSessionRecovery();
        
        if (!recovered) {
          // If recovery failed and we've exhausted retries
          if (retryCount + 1 >= defaultOptions.maxRetries) {
            if (defaultOptions.redirectOnFailure) {
              errorLogger.logAuthError(
                'Max auth retries reached, redirecting to login',
                {
                  component: 'useAuthWithErrorHandling',
                  action: 'auth_redirect',
                },
                {
                  totalRetries: retryCount + 1,
                  maxRetries: defaultOptions.maxRetries,
                  errorType: authError.type,
                }
              );

              toast({
                title: "Sessão expirada",
                description: "Redirecionando para login...",
                variant: "destructive",
              });

              // Clear local storage and redirect
              localStorage.removeItem('user');
              localStorage.removeItem('profile');
              navigate('/auth', { replace: true });
            }
          }
        }
      }, delay);
    } else if (!authError.shouldRetry && defaultOptions.redirectOnFailure) {
      // For non-retryable errors, redirect immediately
      if (authError.type === 'invalid_credentials' || authError.type === 'permission_denied') {
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    }
  }, [authError, retryCount, defaultOptions, toast, navigate, attemptSessionRecovery]);

  const retryAuthentication = useCallback(async () => {
    if (retryCount >= defaultOptions.maxRetries) {
      toast({
        title: "Limite de tentativas atingido",
        description: "Redirecionando para login...",
        variant: "destructive",
      });
      navigate('/auth', { replace: true });
      return;
    }

    await attemptSessionRecovery();
  }, [retryCount, defaultOptions.maxRetries, toast, navigate, attemptSessionRecovery]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setRetryCount(0);
    setIsRecovering(false);
  }, []);

  // Monitor authentication state and handle errors
  useEffect(() => {
    if (auth.loading) {
      return;
    }

    // Check for session expiration every 5 minutes
    const sessionCheckInterval = setInterval(async () => {
      if (auth.isAuthenticated) {
        try {
          await auth.checkAuthStatus();
          
          if (!auth.isAuthenticated) {
            // Session expired silently
            const sessionError = new Error('Session expired');
            handleAuthError(sessionError, { source: 'periodic_check' });
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          handleAuthError(err, { source: 'periodic_check' });
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [auth.isAuthenticated, auth.loading, handleAuthError]);

  // Enhanced authentication methods with error handling
  const signInWithErrorHandling = useCallback(async (username, password) => {
    try {
      const result = await auth.signIn(username, password);
      
      if (result.error) {
        const error = new Error(result.error.message);
        await handleAuthError(error, { 
          action: 'sign_in', 
          username,
          hasErrors: !!result.error.errors 
        });
        return result;
      }

      // Clear any previous errors on successful login
      clearAuthError();
      
      errorLogger.logAuthError(
        'User signed in successfully',
        {
          component: 'useAuthWithErrorHandling',
          action: 'sign_in_success',
        },
        {
          userId: result.data?.user?.id,
          userRole: result.data?.profile?.role,
        }
      );

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await handleAuthError(err, { action: 'sign_in', username });
      return { data: null, error: { message: err.message } };
    }
  }, [auth.signIn, handleAuthError, clearAuthError]);

  const signUpWithErrorHandling = useCallback(async (
    username, 
    password, 
    fullName, 
    email, 
    role = 'student'
  ) => {
    try {
      const result = await auth.signUp(username, password, fullName, email, role);
      
      if (result.error) {
        const error = new Error(result.error.message);
        await handleAuthError(error, { 
          action: 'sign_up', 
          username, 
          email, 
          role,
          hasErrors: !!result.error.errors 
        });
        return result;
      }

      clearAuthError();
      
      errorLogger.logAuthError(
        'User signed up successfully',
        {
          component: 'useAuthWithErrorHandling',
          action: 'sign_up_success',
        },
        {
          userId: result.data?.user?.id,
          userRole: result.data?.profile?.role,
          email,
        }
      );

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await handleAuthError(err, { action: 'sign_up', username, email, role });
      return { data: null, error: { message: err.message } };
    }
  }, [auth.signUp, handleAuthError, clearAuthError]);

  const signOutWithErrorHandling = useCallback(async () => {
    try {
      await auth.signOut();
      
      clearAuthError();
      
      errorLogger.logAuthError(
        'User signed out',
        {
          component: 'useAuthWithErrorHandling',
          action: 'sign_out',
        },
        {
          userId: auth.user?.id,
        }
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      errorLogger.logAuthError(
        'Sign out failed',
        {
          component: 'useAuthWithErrorHandling',
          action: 'sign_out_failed',
        },
        {
          error: err.message,
          userId: auth.user?.id,
        }
      );

      // Force sign out even if it fails on server
      localStorage.removeItem('user');
      localStorage.removeItem('profile');
      window.location.href = '/';
    }
  }, [auth.signOut, auth.user?.id, clearAuthError]);

  return {
    // Original auth properties
    user: auth.user,
    profile: auth.profile,
    loading: auth.loading,
    isAuthenticated: auth.isAuthenticated,
    isAdmin: auth.isAdmin,
    isTeacher: auth.isTeacher,
    isStudent: auth.isStudent,
    session: auth.session,
    
    // Enhanced methods with error handling
    signIn: signInWithErrorHandling,
    signUp: signUpWithErrorHandling,
    signOut: signOutWithErrorHandling,
    
    // Error handling specific properties
    authError,
    retryCount,
    isRecovering,
    maxRetries: defaultOptions.maxRetries,
    
    // Error handling methods
    retryAuthentication,
    clearAuthError,
    attemptSessionRecovery,
    handleAuthError,
  };
}
