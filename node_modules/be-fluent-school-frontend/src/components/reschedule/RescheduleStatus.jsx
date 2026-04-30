import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, FileText, RefreshCw, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function RescheduleStatus({ studentId  }) {
  const queryClient = useQueryClient();

  // Fetch student reschedules
  const { data: reschedules = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/class-reschedules/student', studentId],
    queryFn: () => apiRequest(`/class-reschedules/student/${studentId}`),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const formatDateTime = (dateTime) => {
    const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
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
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" data-testid={`status-pending`}>
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" data-testid={`status-approved`}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" data-testid={`status-rejected`}>
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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
          Carregando solicitações de reagendamento...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            <CardTitle>Meus Reagendamentos</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-reschedules"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        <CardDescription>
          Acompanhe o status das suas solicitações de reagendamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reschedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Você ainda não fez nenhuma solicitação de reagendamento</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" data-testid="tab-all">
                Todas ({reschedules.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pendentes ({pendingReschedules.length})
              </TabsTrigger>
              <TabsTrigger value="processed" data-testid="tab-processed">
                Processadas ({processedReschedules.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4 mt-4">
              <div className="space-y-4">
                {reschedules.map((reschedule) => (
                  <div
                    key={reschedule.id}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    data-testid={`reschedule-item-${reschedule.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(reschedule.status)}
                        <span className="font-medium">Solicitação de Reagendamento</span>
                      </div>
                      {getStatusBadge(reschedule.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Horário Original:</span>
                        </div>
                        <p className="ml-6">{formatDateTime(reschedule.old_scheduled_at)}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">Novo Horário Solicitado:</span>
                        </div>
                        <p className="ml-6 font-medium">{formatDateTime(reschedule.new_scheduled_at)}</p>
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">Motivo:</span>
                        </div>
                        <p className="ml-6">{reschedule.reason}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">Data da Solicitação:</span>
                        </div>
                        <p className="ml-6">{formatDateTime(reschedule.created_at)}</p>
                      </div>
                      
                      {reschedule.status !== 'pending' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Data da Resposta:</span>
                          </div>
                          <p className="ml-6">{formatDateTime(reschedule.updated_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4 mt-4">
              {pendingReschedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Não há solicitações pendentes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReschedules.map((reschedule) => (
                    <div
                      key={reschedule.id}
                      className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950 hover:shadow-sm transition-shadow"
                      data-testid={`pending-reschedule-${reschedule.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium">Aguardando Aprovação</span>
                        </div>
                        {getStatusBadge(reschedule.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">De: {formatDateTime(reschedule.old_scheduled_at)}</p>
                          <p className="font-medium">Para: {formatDateTime(reschedule.new_scheduled_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Solicitado em: {formatDateTime(reschedule.created_at)}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground">Motivo: {reschedule.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="processed" className="space-y-4 mt-4">
              {processedReschedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma solicitação processada ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Horário Original</TableHead>
                      <TableHead>Novo Horário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Processada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedReschedules.map((reschedule) => (
                      <TableRow key={reschedule.id} data-testid={`processed-reschedule-${reschedule.id}`}>
                        <TableCell>{formatDateTime(reschedule.old_scheduled_at)}</TableCell>
                        <TableCell className="font-medium">{formatDateTime(reschedule.new_scheduled_at)}</TableCell>
                        <TableCell>{getStatusBadge(reschedule.status)}</TableCell>
                        <TableCell>{formatDateTime(reschedule.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}