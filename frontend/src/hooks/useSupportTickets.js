import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useSupportTickets() {
  return useQuery({
    queryKey: ['/api/support-tickets'],
    staleTime: 1000 * 60,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiRequest('/support-tickets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] }),
  });
}
