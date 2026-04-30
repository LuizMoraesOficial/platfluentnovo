import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarIcon, Clock, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
export function RescheduleDialog({ classItem, trigger }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState('date');

  // Get available slots for the selected date
  const { data: availableSlotsData, isLoading: slotsLoading, error: slotsError } = useQuery({
    queryKey: ['/api/available-slots', classItem.teacher_id, selectedDate?.toISOString().split('T')[0], classItem.duration_minutes],
    queryFn: () => apiRequest(`/available-slots/${classItem.teacher_id}/${selectedDate?.toISOString().split('T')[0]}?duration=${classItem.duration_minutes}`),
    enabled: !!selectedDate && isOpen,
    retry: 2,
    retryDelay: 1000,
  });

  const rescheduleClassMutation = useMutation({
    mutationFn: (rescheduleData) => apiRequest('/class-reschedules', {
      method: 'POST',
      body: JSON.stringify(rescheduleData),
    }),
    onSuccess: () => {
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de reagendamento foi enviada para aprovação.",
      });
      handleCloseDialog();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-reschedules'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao solicitar reagendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot('');
    if (date) {
      setStep('time');
    }
  };

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleSubmit = () => {
    // Enhanced validations
    if (!selectedDate || !selectedTimeSlot || !reason.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione uma data, horário e preencha o motivo.",
        variant: "destructive",
      });
      return;
    }

    // Validate reason length
    if (reason.trim().length < 10) {
      toast({
        title: "Motivo muito curto",
        description: "Por favor, explique com mais detalhes o motivo do reagendamento (mínimo 10 caracteres).",
        variant: "destructive",
      });
      return;
    }

    // Check if selected date is not in the past
    const now = new Date();
    const selectedDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTimeSlot}`);
    
    if (selectedDateTime <= now) {
      toast({
        title: "Data inválida",
        description: "Não é possível reagendar para uma data/horário no passado.",
        variant: "destructive",
      });
      return;
    }

    // Check if it's the same date/time as current
    const currentDateTime = new Date(classItem.scheduled_at);
    if (Math.abs(selectedDateTime.getTime() - currentDateTime.getTime()) < 60000) { // Less than 1 minute difference
      toast({
        title: "Mesmo horário",
        description: "O novo horário deve ser diferente do horário atual.",
        variant: "destructive",
      });
      return;
    }

    // Check if selected slot is still available (double-check)
    if (availableSlotsData && !availableSlotsData.available_slots.includes(selectedTimeSlot)) {
      toast({
        title: "Horário indisponível",
        description: "Este horário não está mais disponível. Por favor, escolha outro.",
        variant: "destructive",
      });
      setSelectedTimeSlot(''); // Reset selection
      return;
    }

    // Combine date and time into ISO string
    const dateStr = selectedDate.toISOString().split('T')[0];
    const newScheduledAt = new Date(`${dateStr}T${selectedTimeSlot}`).toISOString();
    
    rescheduleClassMutation.mutate({
      class_id: classItem.id,
      old_scheduled_at: classItem.scheduled_at,
      new_scheduled_at: newScheduledAt,
      reason: reason.trim(),
    });
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setSelectedDate(undefined);
    setSelectedTimeSlot('');
    setReason('');
    setStep('date');
  };

  const handleBackToDate = () => {
    setStep('date');
    setSelectedTimeSlot('');
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm"
            data-testid={`button-reschedule-${classItem.id}`}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reagendar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-reschedule">
        <DialogHeader>
          <DialogTitle>Solicitar Reagendamento</DialogTitle>
          <DialogDescription>
            Solicite uma nova data e horário para sua aula. A solicitação será enviada para aprovação.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current class info */}
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Aula atual:</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              {formatDateTime(classItem.scheduled_at)}
              <Clock className="h-4 w-4 ml-2" />
              {classItem.duration_minutes} min
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-4 py-2">
            <div className={`flex items-center gap-2 ${step === 'date' ? 'text-primary' : selectedDate ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                selectedDate ? 'bg-green-100 text-green-800' : step === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {selectedDate ? <CheckCircle2 className="h-3 w-3" /> : '1'}
              </div>
              <span className="text-sm font-medium">Selecionar Data</span>
            </div>
            <div className="flex-1 h-px bg-muted" />
            <div className={`flex items-center gap-2 ${step === 'time' ? 'text-primary' : selectedTimeSlot ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                selectedTimeSlot ? 'bg-green-100 text-green-800' : step === 'time' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {selectedTimeSlot ? <CheckCircle2 className="h-3 w-3" /> : '2'}
              </div>
              <span className="text-sm font-medium">Selecionar Horário</span>
            </div>
          </div>

          {/* Date Selection Step */}
          {step === 'date' && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Escolha uma nova data</Label>
                <p className="text-sm text-muted-foreground mt-1">Selecione um dia para ver os horários disponíveis</p>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  // Disable past dates
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                className="rounded-md border"
                data-testid="calendar-reschedule"
              />
            </div>
          )}

          {/* Time Selection Step */}
          {step === 'time' && selectedDate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Escolha um horário</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedDate.toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToDate}
                  data-testid="button-back-to-date"
                >
                  ← Voltar
                </Button>
              </div>
              
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Carregando horários disponíveis...</span>
                </div>
              ) : slotsError ? (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
                    <p className="text-center text-destructive mb-2">
                      Erro ao carregar horários
                    </p>
                    <p className="text-center text-muted-foreground text-sm mb-4">
                      Ocorreu um problema ao buscar os horários disponíveis.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/available-slots', classItem.teacher_id, selectedDate?.toISOString().split('T')[0]] });
                        }}
                        data-testid="button-retry-slots"
                      >
                        Tentar novamente
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleBackToDate}
                        data-testid="button-back-from-error"
                      >
                        Voltar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : availableSlotsData && availableSlotsData.available_slots.length > 0 ? (
                <>
                  <div className="text-center mb-3">
                    <Badge variant="outline" className="text-xs">
                      {availableSlotsData.available_slots.length} horário{availableSlotsData.available_slots.length !== 1 ? 's' : ''} disponível{availableSlotsData.available_slots.length !== 1 ? 'eis' : ''}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableSlotsData.available_slots.map((slot) => {
                      // Check if slot is in the past for today's date
                      const slotDateTime = new Date(`${selectedDate?.toISOString().split('T')[0]}T${slot}`);
                      const isSlotInPast = slotDateTime <= new Date();
                      
                      return (
                        <Button
                          key={slot}
                          variant={selectedTimeSlot === slot ? "default" : "outline"}
                          className={`h-12 text-sm font-medium transition-all ${
                            isSlotInPast
                              ? "opacity-50 cursor-not-allowed"
                              : selectedTimeSlot === slot 
                                ? "bg-primary text-primary-foreground shadow-md" 
                                : "hover:bg-primary/10 hover:border-primary/50 hover:scale-105"
                          }`}
                          onClick={() => !isSlotInPast && handleTimeSlotSelect(slot)}
                          disabled={isSlotInPast}
                          data-testid={`slot-${slot}`}
                          title={isSlotInPast ? "Este horário já passou" : `Selecionar ${slot}`}
                        >
                          {slot}
                          {isSlotInPast && <span className="ml-1 text-xs opacity-70">✕</span>}
                        </Button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h4 className="font-medium mb-2">Nenhum horário disponível</h4>
                    <p className="text-center text-muted-foreground text-sm mb-4">
                      O professor não tem horários livres neste dia ou ainda não definiu sua disponibilidade.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleBackToDate}
                        data-testid="button-choose-another-date"
                      >
                        ← Escolher outra data
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tente datas futuras ou entre em contato com o professor
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Summary and Reason (shown when time is selected) */}
          {selectedDate && selectedTimeSlot && (
            <div className="space-y-4 border-t pt-4">
              {/* Selected slot summary */}
              <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Nova data e horário selecionados:
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {selectedDate.toLocaleDateString('pt-BR', { 
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric'
                    })} às {selectedTimeSlot}
                  </span>
                  <Clock className="h-4 w-4 ml-2 text-primary" />
                  {classItem.duration_minutes} min
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo do reagendamento *</Label>
                <div className="relative">
                  <Textarea
                    id="reason"
                    placeholder="Explique detalhadamente o motivo da solicitação de reagendamento..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className={reason.trim() && reason.trim().length < 10 ? "border-orange-300 focus:border-orange-500" : ""}
                    data-testid="textarea-reschedule-reason"
                  />
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs ${reason.trim().length < 10 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {reason.trim().length < 10 ? 'Mínimo 10 caracteres' : 'Motivo adequado'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {reason.length}/500
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCloseDialog}
            data-testid="button-cancel-reschedule"
          >
            Cancelar
          </Button>
          
          {selectedDate && selectedTimeSlot && (
            <Button 
              onClick={handleSubmit}
              disabled={rescheduleClassMutation.isPending || !reason.trim()}
              data-testid="button-submit-reschedule"
            >
              {rescheduleClassMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Solicitar Reagendamento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}