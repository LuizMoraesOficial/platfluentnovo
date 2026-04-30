import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useStudentProgress(studentId) {
  return useQuery({
    queryKey: ['/api/progress', studentId],
    queryFn: () => apiRequest(`/progress/${studentId}`),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLessonProgress(studentId) {
  return useQuery({
    queryKey: ['/api/lesson-progress', studentId],
    queryFn: () => apiRequest(`/lesson-progress/${studentId}`),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSaveLessonProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/lesson-progress', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
    },
  });
}
