import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useInboxMessages() {
  return useQuery({
    queryKey: ['/api/messages/inbox'],
    staleTime: 1000 * 30,
  });
}

export function useSentMessages() {
  return useQuery({
    queryKey: ['/api/messages/sent'],
    staleTime: 1000 * 30,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/messages', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/sent'] });
    },
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiRequest(`/messages/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/messages/inbox'] }),
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiRequest(`/messages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/sent'] });
    },
  });
}
