import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Users, Video, Plus, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { RescheduleDialog } from '@/components/reschedule/RescheduleDialog';


// API CONTRACT FIX: API returns available slots as string array, not objects
export function SmartCalendar({ userRole = 'student', userName = 'Usuário'  }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedBookingDate, setSelectedBookingDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [bookingDuration, setBookingDuration] = useState(60);

  // Fetch teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['/teachers'],
    queryFn: () => apiRequest('/teachers'),
  });

  // Fetch student's classes (if student)
  const { data: studentClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['/api/classes/student', profile?.id],
    queryFn: () => apiRequest(`/classes/student/${profile?.id}`),
    enabled: userRole === 'student' && !!profile?.id,
  });

  // Fetch teacher's classes (if teacher)
  const { data: teacherClasses = [], isLoading: teacherClassesLoading } = useQuery({
    queryKey: ['/api/classes/teacher', profile?.id],
    queryFn: () => apiRequest(`/classes/teacher/${profile?.id}`),
    enabled: userRole === 'teacher' && !!profile?.id,
  });

  // Fetch available slots for selected teacher and date  
  const { data: availableSlotsResponse, isLoading: slotsLoading } = useQuery({
    queryKey: ['/api/available-slots', selectedTeacher, selectedBookingDate, bookingDuration],
    queryFn: () => apiRequest(`/available-slots/${selectedTeacher}/${selectedBookingDate}?duration=${bookingDuration}`),
    enabled: !!selectedTeacher && !!selectedBookingDate,
  });
  
  // Extract the available slots array from response
  const availableSlots = availableSlotsResponse?.available_slots || [];

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (classData) => apiRequest('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    }),
    onSuccess: () => {
      toast({
        title: "Aula agendada!",
        description: "Sua aula foi agendada com sucesso.",
      });
      setIsBookingOpen(false);
      setSelectedTeacher('');
      setSelectedBookingDate('');
      setSelectedTimeSlot('');
      // CACHE FIX: Invalidate ALL related caches to prevent stale UI
      queryClient.invalidateQueries({ queryKey: ['/api/classes/student', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes/teacher', selectedTeacher] });
      queryClient.invalidateQueries({ queryKey: ['/api/available-slots', selectedTeacher] });
      // Invalidate teachers list in case availability changed
      queryClient.invalidateQueries({ queryKey: ['/teachers'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao agendar",
        description: error.message || "Não foi possível agendar a aula. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'rescheduled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled': return 'Agendada';
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      case 'rescheduled': return 'Remarcada';
      default: return 'Desconhecida';
    }
  };

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      weekday: date.toLocaleDateString('pt-BR', { weekday: 'long' })
    };
  };

  const handleBookClass = () => {
    if (!profile?.id || !selectedTeacher || !selectedBookingDate || !selectedTimeSlot) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione todas as informações necessárias.",
        variant: "destructive",
      });
      return;
    }

    // TIMEZONE FIX: Create proper UTC datetime to avoid timezone/DST issues
    const localDateTime = new Date(`${selectedBookingDate}T${selectedTimeSlot}:00`);
    const scheduledDateTime = localDateTime.toISOString();
    
    createClassMutation.mutate({
      student_id: profile.id,
      teacher_id: selectedTeacher,
      scheduled_at: scheduledDateTime,
      duration_minutes: bookingDuration,
    });
  };

  // Process classes data for display
  const currentClasses = userRole === 'student' ? studentClasses : teacherClasses;
  const upcomingClasses = currentClasses
    ?.filter((cls) => new Date(cls.scheduled_at) > new Date())
    ?.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    ?.slice(0, 3) || [];

  // Group classes by date
  const classesByDate = currentClasses?.reduce((acc, cls) => {
    const date = cls.scheduled_at.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(cls);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Calendário de Aulas
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximas Aulas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximas Aulas
            </CardTitle>
            <CardDescription>Suas aulas agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            {classesLoading || teacherClassesLoading ? (
              <div className="flex items-center gap-2 p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando aulas...</span>
              </div>
            ) : upcomingClasses.length > 0 ? (
              <div className="space-y-3">
                {upcomingClasses.map((cls) => {
                  const datetime = formatDateTime(cls.scheduled_at);
                  return (
                    <div key={cls.id} className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-sm transition-shadow" data-testid={`class-card-${cls.id}`}>
                      <div className="p-2 rounded bg-blue-100 dark:bg-blue-900">
                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">
                          Aula Individual - {cls.duration_minutes} min
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {datetime.weekday}, {datetime.date} às {datetime.time}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(cls.status)}`}></div>
                        {/* Reschedule button for students (only for future classes) */}
                        {userRole === 'student' && profile?.id === cls.student_id && 
                         new Date(cls.scheduled_at) > new Date() && 
                         cls.status === 'scheduled' && (
                          <RescheduleDialog 
                            classItem={cls}
                            trigger={
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0" 
                                data-testid={`button-reschedule-${cls.id}`}
                                title="Reagendar aula"
                              >
                                <Calendar className="h-3 w-3" />
                              </Button>
                            }
                          />
                        )}
                        {cls.meet_link && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0" 
                            data-testid={`button-meet-${cls.id}`}
                            onClick={() => window.open(cls.meet_link, '_blank')}
                            title="Join Google Meet"
                          >
                            <Video className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <p>Nenhuma aula agendada</p>
                {userRole === 'student' && (
                  <p className="text-xs">Suas aulas aparecerão aqui quando forem agendadas</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendário Semanal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agenda da Semana</CardTitle>
            <CardDescription>Visão geral das suas aulas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(classesByDate).length > 0 ? (
                Object.entries(classesByDate).map(([date, dayClasses]) => (
                  <div key={date} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <div className="space-y-2">
                      {dayClasses.map((cls) => {
                        const datetime = formatDateTime(cls.scheduled_at);
                        return (
                          <div key={cls.id} className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <BookOpen className="h-4 w-4" />
                                  <h4 className="font-medium">Aula Individual</h4>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getStatusColor(cls.status)} text-white border-none`}
                                  >
                                    {getStatusLabel(cls.status)}
                                  </Badge>
                                </div>
                                <p className="text-sm opacity-80 mb-2">
                                  {datetime.time} • {cls.duration_minutes} min
                                </p>
                                {cls.notes && (
                                  <p className="text-sm opacity-70">{cls.notes}</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                {/* Reschedule button for students (only for future classes) */}
                                {userRole === 'student' && profile?.id === cls.student_id && 
                                 new Date(cls.scheduled_at) > new Date() && 
                                 cls.status === 'scheduled' && (
                                  <RescheduleDialog 
                                    classItem={cls}
                                    trigger={
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8"
                                        data-testid={`button-reschedule-week-${cls.id}`}
                                        title="Reagendar aula"
                                      >
                                        <Calendar className="h-4 w-4 mr-1" />
                                        Reagendar
                                      </Button>
                                    }
                                  />
                                )}
                                {cls.meet_link && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => window.open(cls.meet_link, '_blank')}
                                    title="Join Google Meet"
                                  >
                                    <Video className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>Nenhuma aula na agenda</p>
                  {userRole === 'student' && (
                    <p className="text-xs">Suas aulas aparecerão aqui quando forem agendadas</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas das Aulas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stats-total-classes">
                  {currentClasses?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total de aulas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stats-upcoming-classes">
                  {upcomingClasses.length}
                </p>
                <p className="text-sm text-muted-foreground">Próximas aulas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {userRole === 'admin' && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stats-teachers-count">
                    {teachers?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Professores disponíveis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}