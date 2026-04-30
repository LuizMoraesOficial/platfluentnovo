import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users, BookOpen, Plus, Trash2, Play, Copy, Loader2, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

// Be Fluent curriculum structure
const BF_MODULES = [
  { id: 'S1', label: 'S1 — Start 1', level: 'Start', cefr: 'A1' },
  { id: 'S2', label: 'S2 — Start 2', level: 'Start', cefr: 'A1' },
  { id: 'S3', label: 'S3 — Start 3', level: 'Start', cefr: 'A2' },
  { id: 'I1', label: 'I1 — Intermediate 1', level: 'Intermediate', cefr: 'B1' },
  { id: 'I2', label: 'I2 — Intermediate 2', level: 'Intermediate', cefr: 'B1' },
  { id: 'I3', label: 'I3 — Intermediate 3', level: 'Intermediate', cefr: 'B2' },
  { id: 'AD1', label: 'AD1 — Advanced 1', level: 'Advanced', cefr: 'B2' },
  { id: 'AD2', label: 'AD2 — Advanced 2', level: 'Advanced', cefr: 'C1' },
  { id: 'AD3', label: 'AD3 — Advanced 3', level: 'Advanced', cefr: 'C1' },
  { id: 'AD4', label: 'AD4 — Extra Module', level: 'Advanced', cefr: 'C2' },
];

const EXAM_MILESTONES = [6, 11, 20];

// Modal shown when teacher clicks "Finalizar" on a class
function FinalizeClassModal({ classData, studentProfile, onClose, onConfirm, isPending }) {
  const currentActivity = studentProfile?.current_activity || 1;
  const currentModule = studentProfile?.current_module || 'S1';

  const [activityNumber, setActivityNumber] = useState(String(currentActivity));
  const [activityCompleted, setActivityCompleted] = useState('no');

  const selectedActivity = Number(activityNumber);
  const willTriggerExam = activityCompleted === 'yes' && EXAM_MILESTONES.includes(selectedActivity);

  return (
    <DialogContent style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.09)', maxWidth: 480 }}>
      <DialogHeader>
        <DialogTitle style={{ color: '#eeeef0' }}>Finalizar Aula</DialogTitle>
        <DialogDescription style={{ color: '#42424a' }}>
          Registre o progresso da atividade trabalhada nessa aula.
        </DialogDescription>
      </DialogHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        {/* Module info (read-only) */}
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(229,147,19,0.07)', border: '1px solid rgba(229,147,19,0.18)' }}>
          <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#E59313', marginBottom: 4 }}>MÓDULO ATUAL DO ALUNO</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#eeeef0' }}>
            {currentModule} — {BF_MODULES.find(m => m.id === currentModule)?.label || currentModule}
          </p>
        </div>

        {/* Activity number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>ATIVIDADE TRABALHADA</label>
          <Select value={activityNumber} onValueChange={setActivityNumber}>
            <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                <SelectItem key={n} value={String(n)}>
                  Atividade {n}{EXAM_MILESTONES.includes(n) ? ' ⭐' : ''}
                  {n === currentActivity ? ' (atual)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p style={{ fontSize: 11, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
            ⭐ Atividades 6, 11 e 20 liberam a prova teórica quando concluídas.
          </p>
        </div>

        {/* Was activity completed? */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>A ATIVIDADE FOI CONCLUÍDA NESSA AULA?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { value: 'yes', label: 'Sim, concluída', desc: 'Atividade 100% finalizada' },
              { value: 'no', label: 'Não, continua', desc: 'Continuará na próxima aula' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActivityCompleted(opt.value)}
                style={{
                  padding: '12px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                  background: activityCompleted === opt.value
                    ? (opt.value === 'yes' ? 'rgba(34,197,94,0.12)' : 'rgba(229,147,19,0.1)')
                    : 'rgba(255,255,255,0.03)',
                  border: activityCompleted === opt.value
                    ? (opt.value === 'yes' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(229,147,19,0.35)')
                    : '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.15s',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: '#eeeef0', marginBottom: 2 }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: '#42424a' }}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Exam milestone alert */}
        {willTriggerExam && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 2 }}>Prova Teórica será liberada!</p>
              <p style={{ fontSize: 11, color: '#42424a', lineHeight: 1.5 }}>
                A atividade {selectedActivity} é um marco de prova. O aluno receberá um aviso automático sobre a prova teórica.
              </p>
            </div>
          </div>
        )}
      </div>

      <DialogFooter style={{ gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#86868e', cursor: 'pointer', fontSize: 13 }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onConfirm({
            activityNumber: Number(activityNumber),
            activityCompleted: activityCompleted === 'yes',
            moduleId: currentModule,
          })}
          className="db-cta"
          style={{ gap: 6 }}
        >
          {isPending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <CheckCircle2 style={{ width: 13, height: 13 }} />}
          Confirmar
        </button>
      </DialogFooter>
    </DialogContent>
  );
}

export function ClassManagement({ teacherName = 'Professor' }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [finalizeClass, setFinalizeClass] = useState(null); // class being finalized

  const isTeacher = profile?.role === 'teacher';
  const isAdmin = profile?.role === 'admin';
  const teacherId = isTeacher ? profile?.id : '';

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['/students'],
    queryFn: () => apiRequest('/students'),
    enabled: isTeacher || isAdmin,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['/api/classes/teacher', teacherId],
    queryFn: () => apiRequest(`/classes/teacher/${teacherId}`),
    enabled: !!teacherId && isTeacher,
  });

  // Get all students to resolve names and current module/activity for finalize modal
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ['/api/students'],
    queryFn: () => apiRequest('/students'),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('/classes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Aula criada!' });
      setIsCreateOpen(false);
      setSelectedStudentId('');
      queryClient.invalidateQueries({ queryKey: ['/api/classes/teacher', teacherId] });
    },
    onError: (e) => toast({ title: 'Erro ao criar aula', description: e.message, variant: 'destructive' }),
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/classes/teacher', teacherId] }),
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const activityMutation = useMutation({
    mutationFn: (data) => apiRequest('/activity-progress', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      if (res?.milestone?.triggered) {
        toast({
          title: '🎯 Marco de prova atingido!',
          description: `Aviso de prova teórica enviado ao aluno automaticamente.`,
        });
      }
    },
    onError: (e) => toast({ title: 'Erro ao registrar atividade', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Aula removida.' });
      queryClient.invalidateQueries({ queryKey: ['/api/classes/teacher', teacherId] });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const handleCreateClass = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!selectedStudentId) { toast({ title: 'Selecione um aluno', variant: 'destructive' }); return; }
    createMutation.mutate({
      student_id: selectedStudentId,
      teacher_id: teacherId,
      scheduled_at: fd.get('date'),
      duration_minutes: Number(fd.get('duration')) || 60,
    });
  };

  const handleFinalizeConfirm = async ({ activityNumber, activityCompleted, moduleId }) => {
    if (!finalizeClass) return;
    const studentId = finalizeClass.student_id;

    // 1. Mark class as completed
    await updateClassMutation.mutateAsync({ id: finalizeClass.id, data: { status: 'completed' } });

    // 2. Register activity progress
    await activityMutation.mutateAsync({
      student_id: studentId,
      module_id: moduleId,
      activity_number: activityNumber,
      status: activityCompleted ? 'completed' : 'in_progress',
      classes_used: 1,
    });

    toast({
      title: activityCompleted ? `✅ Atividade ${activityNumber} concluída!` : `📖 Atividade ${activityNumber} em andamento`,
      description: activityCompleted ? 'Progresso registrado e próxima atividade iniciada.' : 'Continuará na próxima aula.',
    });

    setFinalizeClass(null);
  };

  const todayClasses = classes.filter(c => {
    const today = new Date();
    return new Date(c.scheduled_at).toDateString() === today.toDateString();
  });
  const upcomingClasses = classes.filter(c => c.status === 'scheduled' && new Date(c.scheduled_at) > new Date());
  const completedClasses = classes.filter(c => c.status === 'completed');

  const getStudentName = (studentId) => {
    const s = studentProfiles.find(p => p.id === studentId) || students.find(s => s.id === studentId);
    return s?.full_name || studentId;
  };

  const getStudentProfile = (studentId) => studentProfiles.find(p => p.id === studentId);

  const fmt = (dateStr) => new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtDur = (min) => min >= 60 ? `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ''}` : `${min}min`;

  const statusPill = (status) => {
    const cfg = {
      scheduled: { label: 'Agendada', color: '#3b82f6' },
      completed: { label: 'Concluída', color: '#22c55e' },
      cancelled: { label: 'Cancelada', color: '#ef4444' },
      rescheduled: { label: 'Reagendada', color: '#eab308' },
    }[status] || { label: status, color: '#86868e' };
    return (
      <span className="db-pill" style={{ background: cfg.color + '18', borderColor: cfg.color + '35', color: cfg.color, fontSize: 10 }}>
        {cfg.label}
      </span>
    );
  };

  if (classesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <Loader2 style={{ width: 22, height: 22, color: '#E59313' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="db-panel-title" style={{ fontSize: 18 }}>Minhas Aulas</div>
          <div className="db-panel-sub">{teacherName}</div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="db-cta" style={{ gap: 6 }}>
              <Plus style={{ width: 13, height: 13 }} />
              Nova Aula
            </button>
          </DialogTrigger>
          <DialogContent style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.09)', maxWidth: 440 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#eeeef0' }}>Agendar Nova Aula</DialogTitle>
              <DialogDescription style={{ color: '#42424a' }}>Preencha os dados para criar a aula.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClass}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>ALUNO</label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId} required>
                    <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }}>
                      <SelectValue placeholder="Selecione o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>DATA E HORA</label>
                  <Input name="date" type="datetime-local" required style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>DURAÇÃO</label>
                  <Select name="duration" defaultValue="60">
                    <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                      <SelectItem value="120">120 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button className="db-cta" type="submit" disabled={createMutation.isPending} style={{ gap: 6 }}>
                  {createMutation.isPending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Plus style={{ width: 13, height: 13 }} />}
                  Criar
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Hoje', value: todayClasses.length, color: '#3b82f6', icon: Calendar },
          { label: 'Próximas', value: upcomingClasses.length, color: '#E59313', icon: Clock },
          { label: 'Concluídas', value: completedClasses.length, color: '#22c55e', icon: CheckCircle2 },
          { label: 'Total', value: classes.length, color: '#a855f7', icon: BookOpen },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <div key={label} className={`db-kpi da${i + 1}`} style={{ '--kpi-accent': color + '30', padding: 14 }}>
            <div className="db-kpi-icon" style={{ background: color + '12', borderColor: color + '25', color, width: 28, height: 28, borderRadius: 7 }}>
              <Icon style={{ width: 12, height: 12 }} />
            </div>
            <div className="db-kpi-num" style={{ fontSize: '1.4rem', marginTop: 10 }}>{value}</div>
            <div className="db-kpi-label" style={{ fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Class list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {classes.length === 0 ? (
          <div className="db-panel">
            <div className="db-panel-inner" style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <BookOpen style={{ width: 28, height: 28, color: '#252529' }} />
              <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a' }}>Nenhuma aula agendada</span>
            </div>
          </div>
        ) : (
          classes.map((cls, i) => {
            const studentProfile = getStudentProfile(cls.student_id);
            return (
              <div key={cls.id} className={`db-panel da${(i % 4) + 1}`}>
                <div className="db-panel-inner">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {statusPill(cls.status)}
                        {studentProfile?.current_module && (
                          <span className="db-pill" style={{ background: 'rgba(229,147,19,0.1)', borderColor: 'rgba(229,147,19,0.3)', color: '#E59313', fontSize: 9 }}>
                            {studentProfile.current_module} — Ativ. {studentProfile.current_activity || 1}
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: 13.5, fontWeight: 600, color: '#eeeef0', marginBottom: 3 }}>
                        {getStudentName(cls.student_id)}
                      </h4>
                      <p style={{ fontSize: 11, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
                        {fmt(cls.scheduled_at)} · {fmtDur(cls.duration_minutes)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {cls.status === 'scheduled' && (
                        <>
                          {cls.meet_link && (
                            <button
                              onClick={() => window.open(cls.meet_link, '_blank')}
                              className="db-ghost"
                              style={{ gap: 4, fontSize: 11 }}
                            >
                              <Play style={{ width: 11, height: 11 }} />
                              Iniciar
                            </button>
                          )}
                          {cls.meet_link && (
                            <button
                              onClick={() => { navigator.clipboard.writeText(cls.meet_link); toast({ title: 'Link copiado!' }); }}
                              style={{ padding: '5px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#86868e', cursor: 'pointer' }}
                            >
                              <Copy style={{ width: 11, height: 11 }} />
                            </button>
                          )}
                          {/* FINALIZAR — opens modal */}
                          <Dialog open={finalizeClass?.id === cls.id} onOpenChange={(open) => { if (!open) setFinalizeClass(null); }}>
                            <DialogTrigger asChild>
                              <button
                                onClick={() => setFinalizeClass(cls)}
                                className="db-cta"
                                style={{ fontSize: 11, padding: '5px 12px', gap: 5 }}
                              >
                                <CheckCircle2 style={{ width: 11, height: 11 }} />
                                Finalizar
                              </button>
                            </DialogTrigger>
                            {finalizeClass?.id === cls.id && (
                              <FinalizeClassModal
                                classData={cls}
                                studentProfile={studentProfile}
                                onClose={() => setFinalizeClass(null)}
                                onConfirm={handleFinalizeConfirm}
                                isPending={updateClassMutation.isPending || activityMutation.isPending}
                              />
                            )}
                          </Dialog>
                        </>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(cls.id)}
                        disabled={deleteMutation.isPending}
                        style={{ padding: '5px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer' }}
                      >
                        {deleteMutation.isPending ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> : <Trash2 style={{ width: 11, height: 11 }} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
