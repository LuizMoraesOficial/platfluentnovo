// Error Boundaries
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   ErrorBoundary,
//   GlobalErrorBoundary,
//   ComponentErrorBoundary,
//   AsyncErrorBoundary,
//   useErrorBoundary,
// } from './ErrorBoundary';

// Error Fallback Components
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   ErrorFallback,
//   NetworkErrorFallback,
//   AuthErrorFallback,
//   ValidationErrorFallback,
//   CriticalErrorFallback,
// } from './ErrorFallback';

// Error Modal
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   ErrorModal,
//   CriticalErrorModal,
//   NetworkErrorModal,
//   AuthErrorModal,
// } from './ErrorModal';

// Retry Components
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   RetryButton,
//   useRetry,
//   NetworkRetryButton,
//   AuthRetryButton,
//   ApiRetryButton,
// } from './RetryButton';

// Network Status
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   NetworkStatus,
//   useNetworkStatus,
//   NetworkAware,
// } from './NetworkStatus';

// Form Error Handling
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   FormErrorHandler,
//   FieldErrorDisplay,
//   useFormErrorHandler,
// } from './FormErrorHandler';

// Enhanced Protected Route
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   EnhancedProtectedRoute,
//   withRoleProtection,
//   AdminProtectedRoute,
//   TeacherProtectedRoute,
//   StudentProtectedRoute,
//   TeacherAdminProtectedRoute,
// } from './EnhancedProtectedRoute';

// Error Analytics
// TEMPORARILY DISABLED - Converting from TypeScript
// export {
//   ErrorAnalytics,
// } from './ErrorAnalytics';

// Error Logger (re-export from lib)
export { errorLogger } from '@/lib/errorLogger';

// Enhanced Query Client (re-export from lib)
export {
  enhancedQueryClient,
  apiRequestWithResilience,
  invalidateWithErrorHandling,
  performHealthCheck,
  cleanupEnhancedQueryClient,
} from '@/lib/enhancedQueryClient';

// Circuit Breaker (re-export from lib)
export {
  CircuitBreaker,
  CircuitBreakerState,
  circuitBreakerManager,
  fetchWithCircuitBreaker,
} from '@/lib/circuitBreaker';

// Error Queue (re-export from lib)
export {
  errorQueue,
  queueOperation,
} from '@/lib/errorQueue';

// Enhanced Auth Hook
export {
  useAuthWithErrorHandling,
} from '@/hooks/useAuthWithErrorHandling';
