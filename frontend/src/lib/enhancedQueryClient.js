
// This file has been deprecated to prevent React Query conflicts
// All functionality has been moved to the main queryClient.js file

export { queryClient as enhancedQueryClient } from './queryClient';
export { apiRequest as apiRequestWithResilience } from './queryClient';
export { invalidateUserData as invalidateWithErrorHandling } from './queryClient';

// Placeholder functions for backward compatibility
export const performHealthCheck = async () => ({
  isHealthy: true,
  details: { status: 'healthy', timestamp: new Date().toISOString() }
});

export const cleanupEnhancedQueryClient = () => {
  // No cleanup needed
};
