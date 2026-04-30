import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export function TeacherAvailability({ teacherId  }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    type: 'individual'
  });

  // Fetch teacher availability using standard React Query
  const { data: availability = [], isLoading, error } = useQuery({
    queryKey: ['teacher-availability', teacherId],
    queryFn: async () => {
      try {
        return await apiRequest(`/teacher/${teacherId}/availability`);
      } catch (error) {
        console.error('TeacherAvailability fetch failed:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Add availability mutation
  const addAvailabilityMutation = useMutation({
    mutationFn: async (slot) => {
      try {
        return await apiRequest(`/teacher/${teacherId}/availability`, {
          method: 'POST',
          body: JSON.stringify(slot),
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-availability', teacherId] });
      toast({
        title: "Horário adicionado!",
        description: "Seu horário foi configurado com sucesso.",
      });
      setShowAddDialog(false);
      setNewSlot({ dayOfWeek: '', startTime: '', endTime: '', type: 'individual' });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar horário",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    },
  });

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (slotId) => {
      try {
        return await apiRequest(`/teacher/${teacherId}/availability/${slotId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-availability', teacherId] });
      toast({
        title: "Horário removido!",
        description: "O horário foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover horário",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    },
  });

  const handleAddAvailability = (e) => {
    e.preventDefault();
    if (!newSlot.dayOfWeek || !newSlot.startTime || !newSlot.endTime) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    addAvailabilityMutation.mutate(newSlot);
  };

  const handleDeleteAvailability = (slotId) => {
    deleteAvailabilityMutation.mutate(slotId);
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'individual': return 'Individual';
      case 'group': return 'Grupo';
      case 'both': return 'Ambos';
      default: return type;
    }
  };

  const getStatusColor = (isBooked) => {
    return isBooked ? 'destructive' : 'secondary';
  };

  const getStatusLabel = (isBooked) => {
    return isBooked ? 'Ocupado' : 'Disponível';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Carregando disponibilidade...</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Erro ao carregar disponibilidade. Usando dados de exemplo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Minha Disponibilidade</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Horário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Horário Disponível</DialogTitle>
              <DialogDescription>
                Configure um novo horário em que você estará disponível para dar aulas.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAvailability}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="dayOfWeek">Dia da Semana</Label>
                  <Select 
                    value={newSlot.dayOfWeek} 
                    onValueChange={(value) => setNewSlot({ ...newSlot, dayOfWeek: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Segunda-feira">Segunda-feira</SelectItem>
                      <SelectItem value="Terça-feira">Terça-feira</SelectItem>
                      <SelectItem value="Quarta-feira">Quarta-feira</SelectItem>
                      <SelectItem value="Quinta-feira">Quinta-feira</SelectItem>
                      <SelectItem value="Sexta-feira">Sexta-feira</SelectItem>
                      <SelectItem value="Sábado">Sábado</SelectItem>
                      <SelectItem value="Domingo">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startTime">Hora Início</Label>
                    <Input 
                      type="time" 
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endTime">Hora Fim</Label>
                    <Input 
                      type="time" 
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      required 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo de Aula</Label>
                  <Select 
                    value={newSlot.type} 
                    onValueChange={(value) => setNewSlot({ ...newSlot, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de aula disponível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="group">Grupo/Conversação</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addAvailabilityMutation.isPending}>
                  {addAvailabilityMutation.isPending ? 'Salvando...' : 'Salvar Horário'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-green-500 shrink-0" />
              Horários Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availability.filter((slot) => !slot.isBooked).map((slot) => (
                <div key={slot.id} className="flex items-center gap-2 p-2 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{slot.dayOfWeek} {slot.startTime}-{slot.endTime}</p>
                    <p className="text-xs text-muted-foreground truncate">{getTypeLabel(slot.type)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-xs px-1 py-0 text-green-700 bg-green-100">Livre</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDeleteAvailability(slot.id)}
                      disabled={deleteAvailabilityMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {availability.filter((slot) => !slot.isBooked).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nenhum horário disponível configurado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-red-500 shrink-0" />
              Aulas Agendadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availability.filter((slot) => slot.isBooked).map((slot) => (
                <div key={slot.id} className="flex items-center gap-2 p-2 border rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="w-2 h-2 bg-red-500 rounded-full shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{slot.dayOfWeek} {slot.startTime}-{slot.endTime}</p>
                    <p className="text-xs text-muted-foreground truncate">{getTypeLabel(slot.type)}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs px-1 py-0 shrink-0">Ocupado</Badge>
                </div>
              ))}
              {availability.filter((slot) => slot.isBooked).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nenhuma aula agendada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}