import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useMeetLinks() {
  return useQuery({
    queryKey: ['/api/meet-links'],
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateMeetLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/meet-links', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/meet-links'] }),
  });
}

export function useDeleteMeetLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiRequest(`/meet-links/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/meet-links'] }),
  });
}
