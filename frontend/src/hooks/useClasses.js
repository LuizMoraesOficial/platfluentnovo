import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useStudentClasses(studentId) {
  return useQuery({
    queryKey: ['/api/classes/student', studentId],
    queryFn: () => apiRequest(`/classes/student/${studentId}`),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTeacherClasses(teacherId, start, end) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  return useQuery({
    queryKey: ['/api/classes/teacher', teacherId, start, end],
    queryFn: () => apiRequest(`/classes/teacher/${teacherId}?${params}`),
    enabled: !!teacherId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/classes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
  });
}
