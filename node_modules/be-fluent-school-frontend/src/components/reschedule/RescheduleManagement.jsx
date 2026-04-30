import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


export function RescheduleManagement({ userRole = 'admin', teacherId  }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReschedule, setSelectedReschedule] = useState(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('approve');
  const [actionNotes, setActionNotes] = useState('');

  // Fetch pending reschedules
  const { data: reschedules = [], isLoading } = useQuery({
    queryKey: ['/api/pending-reschedules', teacherId],
    queryFn: () => {
      const params = teacherId ? `?teacherId=${teacherId}` : '';
      return apiRequest(`/pending-reschedules${params}`);
    },
  });

  // Update reschedule mutation
  const updateRescheduleMutation = useMutation({
    mutationFn: (data) => apiRequest(`/class-reschedules/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        status: data.status,
        notes: data.notes 
      }),
    }),
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === 'approved' ? "Reagendamento aprovado!" : "Reagendamento rejeitado",
        description: `A solicitação foi ${variables.status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });
      setIsActionDialogOpen(false);
      setSelectedReschedule(null);
      setActionNotes('');
      
      // Invalidate queries for comprehensive synchronization between tabs
      queryClient.invalidateQueries({ queryKey: ['/api/pending-reschedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/class-reschedules'] });
      // Invalidate teacher and student classes to sync with Calendar and ClassManagement tabs
      if (selectedReschedule) {
        queryClient.invalidateQueries({ queryKey: ['/api/classes/teacher'] });
        queryClient.invalidateQueries({ queryKey: ['/api/classes/student'] });
        queryClient.invalidateQueries({ queryKey: ['/api/available-slots'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao processar solicitação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAction = (reschedule, action) => {
    setSelectedReschedule(reschedule);
    setActionType(action);
    setIsActionDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedReschedule) return;

    updateRescheduleMutation.mutate({
      id: selectedReschedule.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      notes: actionNotes.trim() || undefined,
    });
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" data-testid={`status-pending`}>Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800" data-testid={`status-approved`}>Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive" data-testid={`status-rejected`}>Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter reschedules by status
  const pendingReschedules = reschedules.filter((r) => r.status === 'pending');
  const processedReschedules = reschedules.filter((r) => r.status !== 'pending');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando solicitações...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gerenciar Reagendamentos
          </CardTitle>
          <CardDescription>
            {userRole === 'admin' 
              ? 'Gerencie todas as solicitações de reagendamento da escola'
              : 'Gerencie solicitações de reagendamento das suas aulas'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pendentes ({pendingReschedules.length})
              </TabsTrigger>
              <TabsTrigger value="processed" data-testid="tab-processed">
                Processadas ({processedReschedules.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4">
              {pendingReschedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Não há solicitações pendentes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Horário Atual</TableHead>
                      <TableHead>Novo Horário</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data da Solicitação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReschedules.map((reschedule) => (
                      <TableRow key={reschedule.id} data-testid={`reschedule-row-${reschedule.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {reschedule.requested_by}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(reschedule.old_scheduled_at.toString())}</TableCell>
                        <TableCell className="font-medium">
                          {formatDateTime(reschedule.new_scheduled_at.toString())}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={reschedule.reason}>
                            {reschedule.reason}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(reschedule.created_at.toString())}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAction(reschedule, 'approve')}
                              data-testid={`button-approve-${reschedule.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(reschedule, 'reject')}
                              data-testid={`button-reject-${reschedule.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="processed" className="space-y-4">
              {processedReschedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma solicitação processada ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Horário Atual</TableHead>
                      <TableHead>Novo Horário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Processada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedReschedules.map((reschedule) => (
                      <TableRow key={reschedule.id} data-testid={`processed-row-${reschedule.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {reschedule.requested_by}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(reschedule.old_scheduled_at.toString())}</TableCell>
                        <TableCell>{formatDateTime(reschedule.new_scheduled_at.toString())}</TableCell>
                        <TableCell>{getStatusBadge(reschedule.status)}</TableCell>
                        <TableCell>{formatDateTime(reschedule.updated_at.toString())}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent data-testid="dialog-reschedule-action">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Aprovar' : 'Rejeitar'} Reagendamento
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Tem certeza que deseja aprovar esta solicitação de reagendamento?'
                : 'Tem certeza que deseja rejeitar esta solicitação de reagendamento?'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedReschedule && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p><strong>De:</strong> {formatDateTime(selectedReschedule.old_scheduled_at.toString())}</p>
                <p><strong>Para:</strong> {formatDateTime(selectedReschedule.new_scheduled_at.toString())}</p>
                <p><strong>Motivo:</strong> {selectedReschedule.reason}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="action-notes">
                  Observações {actionType === 'reject' ? '(obrigatório)' : '(opcional)'}
                </Label>
                <Textarea
                  id="action-notes"
                  placeholder={actionType === 'approve' 
                    ? "Adicione observações sobre a aprovação..."
                    : "Explique o motivo da rejeição..."
                  }
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  data-testid="textarea-action-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsActionDialogOpen(false)}
              data-testid="button-cancel-action"
            >
              Cancelar
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={confirmAction}
              disabled={updateRescheduleMutation.isPending || (actionType === 'reject' && !actionNotes.trim())}
              data-testid="button-confirm-action"
            >
              {updateRescheduleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionType === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}