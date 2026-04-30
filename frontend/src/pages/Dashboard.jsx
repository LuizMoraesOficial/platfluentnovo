import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useStudentClasses, useTeacherClasses, useCreateClass } from '@/hooks/useClasses';
import { useCreateStudent, useStudents, useDeleteStudent, useTeachers } from '@/hooks/useStudents';
import { useCreateAnnouncement, useAnnouncements, useDeleteAnnouncement } from '@/hooks/useAnnouncements';
import { useMeetLinks, useCreateMeetLink, useDeleteMeetLink } from '@/hooks/useMeetLinks';
import { OlivIA } from '@/components/olivia/OlivIA';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

// Lazy imports para otimização de performance
import {
  LazyAdminDashboard,
  LazyTeacherDashboard,
  LazyStudentDashboard,
  LazyMessageCenter,
  LazyProgressTracker,
  LazyAdvancedReports,
  LazySmartCalendar,
  LazyFeedbackSystem,
  LazyChatSupport,
  LazyPaymentSystem,
  LazyUserManagement,
  LazySystemSettings,
  LazyTeacherStudentManagement,
  LazyStudentManagement,
  LazyTeacherManagement,
  LazyClassManagement,
  LazyLearningPath,
  LazyStudyMaterials,
  LazyForumSection,
  LazyRescheduleManagement,
  LazyRescheduleStatus,
  LazyStudentFeedback,
  LazyUserProfile,
  LazyUserSettings,
  LazyTeacherEarnings,
  LazyTeacherAvailability,
  ComponentLoadingFallback,
  preloadCriticalComponents
} from '@/components/lazy/LazyComponents';

// Import direto apenas para componentes leves
import { AnnouncementsSection } from '@/components/dashboard/sections/AnnouncementsSection';
import { MobileOptimizations } from '@/components/mobile/MobileOptimizations';
import { DashboardCardSkeleton, TableSkeleton, MeetCardSkeleton } from '@/components/loading/DashboardSkeleton';
import { HelpBubble, helpContent } from '@/components/help/ContextualHelp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Calendar,
  Users,
  BookOpen,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Video,
  X,
  Loader2
} from 'lucide-react';

function useReschedules(profileId) {
  return useQuery({
    queryKey: ['/api/class-reschedules/student', profileId],
    queryFn: () => import('@/lib/queryClient').then(m => m.apiRequest(`/class-reschedules/student/${profileId}`)),
    enabled: !!profileId,
    staleTime: 1000 * 60 * 2,
  });
}

function usePendingReschedules() {
  return useQuery({
    queryKey: ['/api/pending-reschedules'],
    queryFn: () => import('@/lib/queryClient').then(m => m.apiRequest('/pending-reschedules')),
    staleTime: 1000 * 60 * 2,
  });
}

function MaterialsGrid({ toast }) {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['/api/materials'],
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i => <div key={i} className="h-32 animate-pulse rounded-lg border" />)}</div>;
  if (materials.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Nenhum material disponível.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {materials.map((mat, i) => (
        <Card key={mat.id} className={`animate-in fade-in-50 slide-in-from-bottom-2 hover:shadow-lg transition-shadow cursor-pointer`} style={{ animationDelay: `${i * 80}ms` }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-base">{mat.title}</CardTitle>
                <CardDescription className="text-xs">{mat.category}{mat.level ? ` • ${mat.level}` : ''}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">{mat.file_type?.toUpperCase() || 'FILE'}</Badge>
              {mat.file_url ? (
                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => window.open(mat.file_url, '_blank')} data-testid="button-download-material">
                  <Download className="h-3 w-3 mr-1" />
                  Abrir
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Sem arquivo</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RescheduleList({ profile, studentClasses }) {
  const { data: studentReschedules = [] } = useReschedules(
    profile?.role === 'student' ? profile?.id : null
  );
  const { data: pendingReschedules = [] } = usePendingReschedules();

  const fmtDt = (s) => s ? new Date(s).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const statusColor = { pending: 'text-orange-600', approved: 'text-green-600', rejected: 'text-red-600' };
  const statusLabel = { pending: 'Aguardando', approved: 'Aprovada', rejected: 'Recusada' };

  if (profile?.role === 'teacher' || profile?.role === 'admin') {
    if (pendingReschedules.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação de remarcação pendente.</p>;
    }
    return (
      <div className="space-y-4">
        {pendingReschedules.map((r, i) => (
          <Card key={r.id} className={`animate-in fade-in-50 slide-in-from-bottom-2 border-l-4 border-orange-500`} style={{ animationDelay: `${i * 80}ms` }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-lg">{r.student_name || 'Aluno'}</CardTitle>
                  <Badge variant="outline" className="text-orange-600">Pendente</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{fmtDt(r.created_at)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Aula Atual:</strong> {fmtDt(r.original_date)}</div>
                {r.requested_date && <div><strong>Nova Data Solicitada:</strong> {fmtDt(r.requested_date)}</div>}
                {r.reason && <div><strong>Motivo:</strong> {r.reason}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (studentReschedules.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação de remarcação encontrada.</p>;
  }
  return (
    <div className="space-y-4">
      {studentReschedules.map((r, i) => (
        <Card key={r.id} className={`animate-in fade-in-50 slide-in-from-bottom-2 border-l-4 ${r.status === 'approved' ? 'border-green-500' : r.status === 'rejected' ? 'border-red-500' : 'border-orange-500'}`} style={{ animationDelay: `${i * 80}ms` }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {r.status === 'approved' ? <CheckCircle className="h-4 w-4 text-green-500" /> : r.status === 'rejected' ? <AlertCircle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-orange-500" />}
                <CardTitle className="text-lg">{statusLabel[r.status] || r.status}</CardTitle>
                <Badge variant={r.status === 'approved' ? 'secondary' : 'outline'} className={statusColor[r.status] || ''}>
                  {statusLabel[r.status] || r.status}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{fmtDt(r.created_at)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Aula:</strong> {fmtDt(r.original_date)}</div>
              {r.requested_date && <div><strong>Nova Data:</strong> {fmtDt(r.requested_date)}</div>}
              {r.status === 'approved' && r.meet_link && (
                <div className="text-green-600">Remarcação aprovada! Link: {r.meet_link}</div>
              )}
              {r.status === 'pending' && <div className="text-muted-foreground">Aguardando aprovação do professor...</div>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // P7/P5 — aulas reais do aluno
  const { data: studentClasses = [], isLoading: loadingStudentClasses } = useStudentClasses(
    profile?.role === 'student' ? profile?.id : null
  );

  // P2 — mutations para formulários
  const createStudentMutation = useCreateStudent();
  const deleteStudentMutation = useDeleteStudent();
  const createClassMutation = useCreateClass();
  const createAnnouncementMutation = useCreateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();

  // Real data for admin tables
  const isAdminOrTeacher = profile?.role === 'admin' || profile?.role === 'teacher';
  const { data: students = [], isLoading: loadingStudents } = useStudents();
  const { data: teachers = [], isLoading: loadingTeachers } = useTeachers();
  const { data: announcements = [], isLoading: loadingAnnouncements } = useAnnouncements();

  // Meet Links (teachers/admins)
  const { data: meetLinksData = [], isLoading: loadingMeetLinks } = useMeetLinks();
  const createMeetLinkMutation = useCreateMeetLink();
  const deleteMeetLinkMutation = useDeleteMeetLink();
  const [meetDialogOpen, setMeetDialogOpen] = useState(false);

  const { data: teacherClasses = [], isLoading: loadingTeacherClasses } = useTeacherClasses(
    profile?.role === 'teacher' ? profile?.id : null
  );

  // Função para copiar link
  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link do Google Meet foi copiado para a área de transferência.",
    });
  };

  // Função para abrir Google Meet
  const handleOpenMeet = (link) => {
    window.open(link, '_blank');
  };

  const formatClassDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatClassTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Simulate loading time and preload critical components
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Preload critical components based on user role
  useEffect(() => {
    if (profile?.role) {
      preloadCriticalComponents(profile.role);
    }
  }, [profile?.role]);

  if (!profile) {
    return <div>Carregando...</div>;
  }


  const renderStudentDashboard = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <DashboardCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton />
        </div>
      );
    }

    const now = new Date();
    const nextClass = studentClasses
      .filter(c => new Date(c.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const classesThisMonth = studentClasses.filter(c => {
      const d = new Date(c.scheduled_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    const levelMap = { beginner: 'Iniciante', elementary: 'Básico', intermediate: 'Intermediário', 'upper-intermediate': 'Interm. Avançado', advanced: 'Avançado', proficient: 'Fluente' };
    const currentLevel = levelMap[profile?.english_level] || profile?.english_level || 'A definir';
    const firstName = profile?.full_name?.split(' ')[0] || 'Aluno';

    return (
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_32px_100px_-60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(229,147,19,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_20%)] opacity-90" />
          <div className="relative grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-orange-200">Painel estratégico</span>
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">{profile?.role === 'teacher' ? 'Professor' : profile?.role === 'admin' ? 'Administrador' : 'Estudante'}</Badge>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Olá, {firstName}. Seu espaço de fluência está pronto.</h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300">Foco imediato, navegação clara e informação relevante para você gerir estudos, aulas e progresso com controle profissional.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)]">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Próxima aula</p>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-300">Status</p>
                      <p className="mt-2 text-xl font-semibold text-white">{nextClass ? new Date(nextClass.scheduled_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Nenhuma aula agendada'}</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-400/15 text-orange-200">
                      <Calendar className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{nextClass ? `Início às ${new Date(nextClass.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Agende sua próxima aula para manter o ritmo.'}</p>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.6)]">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Progresso</p>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-300">Aulas este mês</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{loadingStudentClasses ? '—' : classesThisMonth}</p>
                    </div>
                    <Users className="h-10 w-10 text-slate-200/60" />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Veja rapidamente o seu ritmo operacional do ciclo atual.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Nível atual</p>
                    <p className="mt-3 text-4xl font-semibold text-white">{currentLevel}</p>
                  </div>
                  <Badge className="rounded-full bg-orange-400/15 px-3 py-1 text-sm text-orange-200">{currentLevel !== 'A definir' ? 'Ativo' : 'A definir'}</Badge>
                </div>
                <div className="mt-6 rounded-3xl bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Meta de aulas</span>
                    <span>{classesThisMonth}/12</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min((classesThisMonth / 12) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Recebimentos</p>
                    <p className="mt-2 text-2xl font-semibold text-white">A configurar</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-emerald-300/80" />
                </div>
                <p className="mt-4 text-sm text-slate-400">Configure seu método de pagamento para garantir continuidade e fluxo tranquilo.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            className="group rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.8)] transition hover:-translate-y-1 hover:border-orange-400/20"
            onClick={() => setActiveSection('schedule')}
            data-testid="card-upcoming-classes"
          >
            <CardHeader>
              <CardTitle className="text-base font-semibold text-white transition-colors group-hover:text-orange-300">Próximas Aulas</CardTitle>
              <CardDescription className="text-slate-400">Mantenha seu cronograma no ponto</CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">Sua próxima sessão</p>
                  <p className="mt-3 text-lg font-semibold text-white">{nextClass ? new Date(nextClass.scheduled_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Nenhuma aula agendada'}</p>
                  <p className="mt-1 text-sm text-slate-400">{nextClass ? `Começa às ${new Date(nextClass.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Clique para marcar sua primeira aula'}</p>
                </div>
                <Calendar className="h-12 w-12 text-orange-300/90" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="group rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.8)] transition hover:-translate-y-1 hover:border-emerald-400/20"
            onClick={() => setActiveSection('progress')}
            data-testid="card-student-progress"
          >
            <CardHeader>
              <CardTitle className="text-base font-semibold text-white transition-colors group-hover:text-emerald-300">Seu Progresso</CardTitle>
              <CardDescription className="text-slate-400">Resultados visíveis</CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">Aulas realizadas</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{loadingStudentClasses ? '—' : classesThisMonth}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-emerald-300/90" />
              </div>
              <p className="mt-4 text-sm text-slate-400">Toque aqui para acompanhar cada conquista no seu caminho.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="group rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.8)] transition hover:-translate-y-1 hover:border-blue-400/20"
            onClick={() => setActiveSection('profile')}
            data-testid="card-current-level"
          >
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-white group-hover:text-blue-300">Nível Atual</CardTitle>
              <BookOpen className="h-5 w-5 text-blue-300/80" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-white">{currentLevel}</p>
              <p className="mt-2 text-sm text-slate-400">Clique para ajustar seu perfil e metas.</p>
            </CardContent>
          </Card>

          <Card
            className="group rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.8)] transition hover:-translate-y-1 hover:border-purple-400/20"
            onClick={() => setActiveSection('payments')}
            data-testid="card-monthly-payment"
          >
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-white group-hover:text-purple-300">Mensalidade</CardTitle>
              <CheckCircle className="h-5 w-5 text-purple-300/80" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-100">A configurar</p>
              <p className="mt-2 text-sm text-slate-400">Mantenha seus pagamentos atualizados para evitar interrupções.</p>
            </CardContent>
          </Card>
        </div>

        {/* Reschedule Status Section */}
        <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-900">
          <RescheduleStatus studentId={profile.id} />
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <DashboardCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Use AdminDashboard component instead of duplicated code */}
        <Suspense fallback={<ComponentLoadingFallback message="Carregando dashboard de administrador..." />}>
          <LazyAdminDashboard isLoading={false} setActiveSection={setActiveSection} />
        </Suspense>

      </div>
    );
  };

  // Google Meet section for teachers
  const renderMeetLinksSection = () => {
    const handleCreateMeet = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const link = fd.get('link')?.toString().trim();

      if (!link) {
        toast({ title: 'Link obrigatório', description: 'Informe o link da reunião para criar a sala.', variant: 'destructive' });
        return;
      }

      try {
        await createMeetLinkMutation.mutateAsync({
          title: fd.get('title'),
          description: fd.get('description') || null,
          link,
        });
        toast({ title: 'Sala criada!', description: 'Link do Google Meet salvo com sucesso.' });
        setMeetDialogOpen(false);
        e.target.reset();
      } catch (err) {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Links Google Meet</h2>
            <HelpBubble {...helpContent.meetLinks} />
          </div>
          <Dialog open={meetDialogOpen} onOpenChange={setMeetDialogOpen}>
            <DialogTrigger asChild>
              <Button className="transition-all hover:scale-105 active:scale-95" data-testid="button-add-meet-link">
                <Plus className="mr-2 h-4 w-4" />
                Criar Sala
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Sala do Google Meet</DialogTitle>
                <DialogDescription>Insira o link real do Google Meet para a nova aula.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateMeet}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="room-title">Título</Label>
                    <Input id="room-title" name="title" placeholder="Ex: Aula Individual - João" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="room-description">Descrição</Label>
                    <Input id="room-description" name="description" placeholder="Ex: Segunda-feira às 14:00" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="room-link">Link do Google Meet</Label>
                    <Input id="room-link" name="link" placeholder="Cole o link da reunião aqui" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMeetLinkMutation.isPending}>
                    {createMeetLinkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Criar Sala
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingMeetLinks ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map(i => <MeetCardSkeleton key={i} />)}
          </div>
        ) : meetLinksData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Video className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma sala criada ainda</p>
              <p className="text-sm mt-1">Clique em "Criar Sala" para gerar um link do Google Meet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {meetLinksData.map((meetLink) => (
              <Card key={meetLink.id} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 hover:shadow-lg transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{meetLink.title}</CardTitle>
                      {meetLink.description && <CardDescription>{meetLink.description}</CardDescription>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      onClick={() => deleteMeetLinkMutation.mutate(meetLink.id, {
                        onSuccess: () => toast({ title: 'Sala removida.' }),
                        onError: (err) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
                      })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Input value={meetLink.link} readOnly className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleCopyLink(meetLink.link)}>
                        Copiar Link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleOpenMeet(meetLink.link)}>
                        <Video className="h-4 w-4 mr-1" />
                        Abrir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Students section for admin
  const renderStudentsSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Gerenciar Alunos</h2>
          <HelpBubble {...helpContent.studentManagement} />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105" data-testid="button-add-student">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Aluno</DialogTitle>
              <DialogDescription>
                Adicione um novo aluno ao sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              try {
                await createStudentMutation.mutateAsync({
                  full_name: formData.get('student-name'),
                  email: formData.get('student-email'),
                  phone: formData.get('student-phone'),
                  english_level: formData.get('student-level') || 'beginner',
                });
                toast({ title: "Aluno criado!", description: "O aluno foi adicionado com sucesso." });
                e.target.reset();
              } catch (err) {
                toast({ title: "Erro ao criar aluno", description: err.message, variant: "destructive" });
              }
            }}>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-name" className="sm:text-right">Nome Completo</Label>
                <Input 
                  id="student-name" 
                  name="student-name"
                  placeholder="Nome completo do aluno" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-student-name" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-cpf" className="sm:text-right">CPF</Label>
                <Input 
                  id="student-cpf" 
                  name="student-cpf"
                  placeholder="000.000.000-00" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-student-cpf" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-email" className="sm:text-right">Email</Label>
                <Input 
                  id="student-email" 
                  name="student-email"
                  type="email" 
                  placeholder="email@exemplo.com" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-student-email" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-phone" className="sm:text-right">Telefone</Label>
                <Input 
                  id="student-phone" 
                  name="student-phone"
                  placeholder="(11) 99999-9999" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-student-phone" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-address" className="sm:text-right">Endereço</Label>
                <Textarea 
                  id="student-address" 
                  name="student-address"
                  placeholder="Rua, número, bairro, cidade - CEP" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500 resize-none" 
                  data-testid="input-student-address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-fee" className="sm:text-right">Mensalidade (R$)</Label>
                <Input 
                  id="student-fee" 
                  name="student-fee"
                  type="number" 
                  placeholder="350,00" 
                  step="0.01"
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-student-fee" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-due-date" className="sm:text-right">Data de Vencimento</Label>
                <Select>
                  <SelectTrigger className="sm:col-span-3" data-testid="select-student-due-date">
                    <SelectValue placeholder="Selecione o dia do vencimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="student-level" className="sm:text-right">Nível</Label>
                <Select>
                  <SelectTrigger className="sm:col-span-3" data-testid="select-student-level">
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="elementary">Básico</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="upper-intermediate">Intermediário Avançado</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                    <SelectItem value="proficient">Fluente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                className="transition-all hover:scale-105"
                data-testid="button-save-student"
              >
                Salvar
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>Gerencie todos os alunos do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Status Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStudents ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : students.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Nenhum aluno cadastrado</TableCell></TableRow>
              ) : students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell><Badge variant="default" className="capitalize">{s.english_level || '—'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-green-600">Ativo</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="transition-all hover:scale-110"
                      data-testid="button-edit-student"
                      onClick={() => setActiveSection('users')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="transition-all hover:scale-110 text-red-600 hover:text-red-700"
                      data-testid="button-delete-student"
                      onClick={() => {
                        if (confirm(`Remover aluno ${s.full_name}?`)) {
                          deleteStudentMutation.mutate(s.id, {
                            onSuccess: () => toast({ title: 'Aluno removido.' }),
                            onError: (err) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Teachers section for admin
  const renderTeachersSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Professores</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105" data-testid="button-add-teacher">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Professor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Professor</DialogTitle>
              <DialogDescription>
                Adicione um novo professor ao sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const teacherData = {
                name: formData.get('teacher-name'),
                cpf: formData.get('teacher-cpf'),
                email: formData.get('teacher-email'),
                phone: formData.get('teacher-phone'),
                address: formData.get('teacher-address'),
                type: formData.get('teacher-type'),
                hourlyRate: formData.get('teacher-hourly-rate')
              };
              toast({
                title: "Redirecionando...",
                description: `Use a seção Gerenciar Professores para criar professores com toda funcionalidade.`,
              });
              (e.target).reset();
              setActiveSection('teachers');
            }}>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher-name" className="sm:text-right">Nome Completo</Label>
                <Input 
                  id="teacher-name" 
                  name="teacher-name"
                  placeholder="Nome completo do professor" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-teacher-name" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher-cpf" className="sm:text-right">CPF</Label>
                <Input 
                  id="teacher-cpf" 
                  name="teacher-cpf"
                  placeholder="000.000.000-00" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-teacher-cpf" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher-email" className="sm:text-right">Email</Label>
                <Input 
                  id="teacher-email" 
                  name="teacher-email"
                  type="email" 
                  placeholder="email@exemplo.com" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-teacher-email" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher-phone" className="sm:text-right">Telefone</Label>
                <Input 
                  id="teacher-phone" 
                  name="teacher-phone"
                  placeholder="(11) 99999-9999" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-teacher-phone" 
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher-address" className="sm:text-right">Endereço</Label>
                <Textarea 
                  id="teacher-address" 
                  name="teacher-address"
                  placeholder="Rua, número, bairro, cidade - CEP" 
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500 resize-none" 
                  data-testid="input-teacher-address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher-type" className="sm:text-right">Tipo de Ensino</Label>
                <Select>
                  <SelectTrigger className="sm:col-span-3" data-testid="select-teacher-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Professor Individual</SelectItem>
                    <SelectItem value="group">Turmas de Conversação</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="teacher-hourly-rate" className="sm:text-right">Valor por Hora (R$)</Label>
                <Input 
                  id="teacher-hourly-rate" 
                  name="teacher-hourly-rate"
                  type="number" 
                  placeholder="85,00" 
                  step="0.01"
                  className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500" 
                  data-testid="input-teacher-hourly-rate" 
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                className="transition-all hover:scale-105"
                data-testid="button-save-teacher"
              >
                Salvar
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle>Lista de Professores</CardTitle>
          <CardDescription>Gerencie todos os professores do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTeachers ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : teachers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum professor cadastrado</TableCell></TableRow>
              ) : teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell><Badge variant="secondary">Ativo</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="transition-all hover:scale-110"
                      data-testid="button-edit-teacher"
                      onClick={() => setActiveSection('teachers')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Classes section
  const renderClassesSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Aulas</h2>
          <HelpBubble {...helpContent.classSchedule} />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105" data-testid="button-new-class">
              <Plus className="mr-2 h-4 w-4" />
{profile?.role === 'student' ? 'Ver Minhas Aulas' : 'Nova Aula'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{profile?.role === 'student' ? 'Criar Nova Aula' : 'Minhas Aulas'}</DialogTitle>
              <DialogDescription>
                {profile?.role === 'student'
                  ? 'Agende sua próxima aula. O link do Google Meet será gerado automaticamente.'
                  : 'Apenas estudantes podem agendar novas aulas por aqui. Professores e administradores veem suas aulas na área de classes.'}
              </DialogDescription>
            </DialogHeader>
            {profile?.role === 'student' ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                try {
                  await createClassMutation.mutateAsync({
                    teacher_id: formData.get('teacher-select'),
                    scheduled_at: `${formData.get('class-date')}T${formData.get('class-time')}:00`,
                    duration_minutes: parseInt(formData.get('class-duration') || '60'),
                  });
                  toast({ title: "Aula criada!", description: "A aula foi agendada com sucesso." });
                  e.target.reset();
                } catch (err) {
                  toast({ title: "Erro ao criar aula", description: err.message, variant: "destructive" });
                }
              }}>
                <div className="grid gap-4 py-4 max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="class-name" className="sm:text-right">Nome da Aula</Label>
                    <Input
                      id="class-name"
                      name="class-name"
                      placeholder="Ex: Aula Individual - Gramática"
                      className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500"
                      data-testid="input-class-name"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="class-date" className="sm:text-right">Data</Label>
                    <Input
                      id="class-date"
                      name="class-date"
                      type="date"
                      className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500"
                      data-testid="input-class-date"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="class-time" className="sm:text-right">Horário</Label>
                    <Input
                      id="class-time"
                      name="class-time"
                      type="time"
                      className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500"
                      data-testid="input-class-time"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacher-select" className="sm:text-right">Professor</Label>
                    <Select name="teacher-select">
                      <SelectTrigger className="sm:col-span-3" data-testid="select-teacher">
                        <SelectValue placeholder="Selecione o professor" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.full_name || `Professor ${teacher.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="class-duration" className="sm:text-right">Duração (min)</Label>
                    <Select name="class-duration">
                      <SelectTrigger className="sm:col-span-3" data-testid="select-duration">
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1h 30min</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="class-notes" className="sm:text-right">Observações</Label>
                    <Textarea
                      id="class-notes"
                      name="class-notes"
                      placeholder="Observações sobre a aula..."
                      className="sm:col-span-3 transition-all focus:ring-2 focus:ring-blue-500 resize-none"
                      data-testid="input-class-notes"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="transition-all hover:scale-105"
                    data-testid="button-save-class"
                  >
                    Criar Aula
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Apenas alunos podem agendar novas aulas diretamente por aqui. Professores e administradores podem visualizar e gerenciar as aulas nas seções apropriadas.
                </p>
                <Button
                  type="button"
                  onClick={() => setActiveSection('classes')}
                  className="transition-all hover:scale-105"
                >
                  Ver Aulas
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle>Agenda de Aulas</CardTitle>
          <CardDescription>Visualize e gerencie as aulas agendadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teacherClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula cadastrada</p>
            ) : teacherClasses.slice(0, 5).map(cls => (
              <div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${cls.status === 'completed' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                    {cls.status === 'completed'
                      ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      : <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    }
                  </div>
                  <div>
                    <p className="font-medium">{cls.class_type || 'Aula'}{cls.student_name ? ` - ${cls.student_name}` : ''}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cls.scheduled_at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {cls.meet_link && <p className="text-xs text-muted-foreground">Link: {cls.meet_link}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={cls.status === 'completed' ? 'outline' : 'secondary'} className={cls.status === 'completed' ? 'text-green-600' : ''}>
                    {cls.status === 'completed' ? 'Concluída' : cls.status === 'scheduled' ? 'Agendada' : cls.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Announcements section 
  const renderAnnouncementsSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Avisos</h2>
        {profile?.role === 'admin' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="transition-all hover:scale-105" data-testid="button-new-announcement">
                <Plus className="mr-2 h-4 w-4" />
                Novo Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Novo Aviso</DialogTitle>
                <DialogDescription>
                  Publique um aviso para todos os usuários da plataforma.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                try {
                  await createAnnouncementMutation.mutateAsync({
                    title: formData.get('announcement-title'),
                    content: formData.get('announcement-content'),
                    priority: formData.get('announcement-priority') || 'medium',
                  });
                  toast({ title: "Aviso publicado!", description: "O aviso foi enviado para todos os usuários." });
                  e.target.reset();
                } catch (err) {
                  toast({ title: "Erro ao publicar aviso", description: err.message, variant: "destructive" });
                }
              }}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="announcement-title">Título</Label>
                    <Input 
                      id="announcement-title" 
                      name="announcement-title"
                      placeholder="Título do aviso" 
                      className="transition-all focus:ring-2 focus:ring-blue-500" 
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="announcement-content">Conteúdo</Label>
                    <Textarea 
                      id="announcement-content" 
                      name="announcement-content"
                      placeholder="Conteúdo do aviso..." 
                      className="transition-all focus:ring-2 focus:ring-blue-500 resize-none min-h-24" 
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="announcement-priority">Prioridade</Label>
                    <Select name="announcement-priority">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="transition-all hover:scale-105">
                    Publicar Aviso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="space-y-4">
        {loadingAnnouncements ? (
          <div className="text-center py-8 text-muted-foreground">Carregando avisos...</div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum aviso publicado.</p>
            </CardContent>
          </Card>
        ) : announcements.map((ann) => {
          const priorityColor = { urgent: 'border-red-500', high: 'border-orange-500', medium: 'border-blue-500', low: 'border-green-500' }[ann.priority] || 'border-blue-500';
          const priorityLabel = { urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' }[ann.priority] || ann.priority;
          const priorityVariant = ann.priority === 'urgent' ? 'destructive' : ann.priority === 'high' ? 'default' : 'secondary';
          return (
            <Card key={ann.id} className={`animate-in fade-in-50 border-l-4 ${priorityColor}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">{ann.title}</CardTitle>
                    <Badge variant={priorityVariant} className="text-xs">{priorityLabel}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(ann.created_at).toLocaleDateString('pt-BR')}</span>
                    {profile?.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                        onClick={() => deleteAnnouncementMutation.mutate(ann.id, {
                          onSuccess: () => toast({ title: 'Aviso removido.' }),
                          onError: (err) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
                        })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{ann.content}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Teacher schedule management section
  const renderScheduleManagementSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Agenda</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105" data-testid="button-add-schedule">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Horário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Definir Horário Disponível</DialogTitle>
              <DialogDescription>
                Configure seus horários disponíveis para ministrar aulas.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              toast({
                title: "Horário adicionado!",
                description: "Seu horário foi configurado com sucesso.",
              });
              (e.target).reset();
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="schedule-day">Dia da Semana</Label>
                  <Select name="schedule-day">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Segunda-feira</SelectItem>
                      <SelectItem value="tuesday">Terça-feira</SelectItem>
                      <SelectItem value="wednesday">Quarta-feira</SelectItem>
                      <SelectItem value="thursday">Quinta-feira</SelectItem>
                      <SelectItem value="friday">Sexta-feira</SelectItem>
                      <SelectItem value="saturday">Sábado</SelectItem>
                      <SelectItem value="sunday">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-time">Hora Início</Label>
                    <Input type="time" id="start-time" name="start-time" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-time">Hora Fim</Label>
                    <Input type="time" id="end-time" name="end-time" required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="schedule-type">Tipo de Aula</Label>
                  <Select name="schedule-type">
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
                <Button type="submit" className="transition-all hover:scale-105">
                  Salvar Horário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horários Disponíveis</CardTitle>
            <CardDescription>Seus horários livres para aulas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Segunda 14:00 - 15:00</p>
                    <p className="text-xs text-muted-foreground">Individual</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSection('availability')}
                  data-testid="button-edit-schedule"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Terça 16:00 - 17:00</p>
                    <p className="text-xs text-muted-foreground">Ambos</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSection('availability')}
                  data-testid="button-edit-schedule"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aulas Agendadas</CardTitle>
            <CardDescription>Horários já ocupados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Hoje 14:00 - 15:00</p>
                    <p className="text-xs text-muted-foreground">João Silva</p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs">Ocupado</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Quinta 16:00 - 17:00</p>
                    <p className="text-xs text-muted-foreground">Turma A</p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs">Ocupado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Reports section for admin
  const renderReportsSection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Relatórios</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Relatório Financeiro
            </CardTitle>
            <CardDescription>Receitas, pagamentos e inadimplência</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Receita Mensal:</span>
                <span className="text-sm font-medium text-green-600">R$ 54.231</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pendências:</span>
                <span className="text-sm font-medium text-red-600">R$ 2.100</span>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => {
                const financialData = `RELATÓRIO FINANCEIRO\n\nReceita Mensal: R$ 54.231\nPendências: R$ 2.100\nData: ${new Date().toLocaleDateString()}\n\nDetalhes:\n- Alunos Ativos: 156\n- Taxa de Frequência: 94%\n- Professores: 12`;
                const blob = new Blob([financialData], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast({
                  title: "Relatório exportado!",
                  description: "Download do arquivo financeiro concluído.",
                });
              }}
              data-testid="button-export-financial-pdf"
            >
              <Download className="h-3 w-3 mr-2" />
              Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-400 hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Relatório de Alunos
            </CardTitle>
            <CardDescription>Frequência e desempenho dos alunos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total de Alunos:</span>
                <span className="text-sm font-medium">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa de Frequência:</span>
                <span className="text-sm font-medium text-green-600">94%</span>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => {
                const header = 'Nome,Email,Nível,Status';
                const rows = students.map(s => [s.full_name || '', s.email || '', s.english_level || '', s.is_active ? 'Ativo' : 'Inativo'].join(','));
                const studentsData = [header, ...rows].join('\n');
                const blob = new Blob([studentsData], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-alunos-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast({
                  title: "Relatório de alunos exportado!",
                  description: "Download do arquivo CSV concluído.",
                });
              }}
              data-testid="button-export-students-excel"
            >
              <Download className="h-3 w-3 mr-2" />
              Exportar Excel
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500 hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Relatório de Aulas
            </CardTitle>
            <CardDescription>Aulas ministradas e cancelamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Aulas Este Mês:</span>
                <span className="text-sm font-medium">340</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa de Conclusão:</span>
                <span className="text-sm font-medium text-green-600">96%</span>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => {
                const header = 'Data,Horário,Professor,Aluno,Tipo,Status';
                const rows = teacherClasses.map(c => {
                  const d = new Date(c.scheduled_at);
                  return [
                    d.toLocaleDateString('pt-BR'),
                    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    c.teacher_name || '',
                    c.student_name || '',
                    c.class_type || '',
                    c.status || '',
                  ].join(',');
                });
                const classesData = [header, ...rows].join('\n');
                const blob = new Blob([classesData], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-aulas-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast({
                  title: "Relatório de aulas exportado!",
                  description: "Download do arquivo CSV concluído.",
                });
              }}
              data-testid="button-export-classes-csv"
            >
              <Download className="h-3 w-3 mr-2" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo Mensal</CardTitle>
          <CardDescription>Estatísticas consolidadas do último mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{students.filter(s => s.is_active).length}</div>
              <p className="text-sm text-muted-foreground">Alunos Ativos</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{teacherClasses.filter(c => c.status === 'completed').length}</div>
              <p className="text-sm text-muted-foreground">Aulas Ministradas</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{teachers.length}</div>
              <p className="text-sm text-muted-foreground">Professores</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">—</div>
              <p className="text-sm text-muted-foreground">Satisfação</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Teacher earnings section - delegates to real LazyTeacherEarnings component
  const renderTeacherEarningsSection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Valores a Receber</h2>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg border" />}>
        <LazyTeacherEarnings teacherId={profile?.id} teacherName={profile?.full_name} />
      </Suspense>
    </div>
  );

  // Enhanced reschedule section
  const renderRescheduleSection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {profile?.role === 'student' ? 'Solicitar Remarcação' : 'Gerenciar Remarcações'}
      </h2>
      
      {profile?.role === 'student' && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="transition-all hover:scale-105" data-testid="button-request-reschedule">
              <Plus className="mr-2 h-4 w-4" />
              Solicitar Remarcação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Solicitar Remarcação de Aula</DialogTitle>
              <DialogDescription>
                Selecione a aula que deseja remarcar e escolha uma nova data.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              toast({
                title: "Solicitação enviada!",
                description: "Sua solicitação foi enviada para aprovação do professor.",
              });
              (e.target).reset();
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-class">Aula Atual</Label>
                  <Select name="current-class">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a aula" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentClasses.filter(c => c.status === 'scheduled').slice(0, 10).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {new Date(c.scheduled_at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          {c.teacher_name ? ` - ${c.teacher_name}` : ''}
                        </SelectItem>
                      ))}
                      {studentClasses.filter(c => c.status === 'scheduled').length === 0 && (
                        <SelectItem value="" disabled>Nenhuma aula agendada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-date">Nova Data Preferida</Label>
                  <Input type="date" id="new-date" name="new-date" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-time">Novo Horário</Label>
                  <Select name="new-time">
                    <SelectTrigger>
                      <SelectValue placeholder="Horários disponíveis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time1">14:00 - 15:00</SelectItem>
                      <SelectItem value="time2">15:00 - 16:00</SelectItem>
                      <SelectItem value="time3">16:00 - 17:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Motivo da Remarcação</Label>
                  <Textarea 
                    id="reason" 
                    name="reason"
                    placeholder="Explique o motivo da remarcação..." 
                    className="resize-none" 
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="transition-all hover:scale-105">
                  Enviar Solicitação
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <RescheduleList profile={profile} studentClasses={studentClasses} />
    </div>
  );

  // Student classes view (no creation, only viewing)
  const renderStudentClassesSection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Minhas Aulas</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Aulas</CardTitle>
            <CardDescription>Suas aulas agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentClasses.filter(c => c.status === 'scheduled' && new Date(c.scheduled_at) >= new Date()).slice(0, 3).map(cls => (
                <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                      <Video className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{new Date(cls.scheduled_at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-muted-foreground">{cls.teacher_name ? `${cls.teacher_name} • ` : ''}{cls.class_type || 'Individual'}</p>
                    </div>
                  </div>
                  {cls.meet_link ? (
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => window.open(cls.meet_link, '_blank')}>Entrar</Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Agendada</Badge>
                  )}
                </div>
              ))}
              {studentClasses.filter(c => c.status === 'scheduled' && new Date(c.scheduled_at) >= new Date()).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhuma aula agendada</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Aulas</CardTitle>
            <CardDescription>Suas últimas aulas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentClasses.filter(c => c.status === 'completed' || c.status === 'missed').slice(0, 4).map(cls => (
                <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${cls.status === 'completed' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      {cls.status === 'completed'
                        ? <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                        : <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{new Date(cls.scheduled_at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-muted-foreground">{cls.teacher_name ? `${cls.teacher_name} • ` : ''}{cls.class_type || 'Individual'}</p>
                    </div>
                  </div>
                  {cls.status === 'completed'
                    ? <Badge variant="outline" className="text-green-600 text-xs">Concluída</Badge>
                    : <Badge variant="destructive" className="text-xs">Faltou</Badge>
                  }
                </div>
              ))}
              {studentClasses.filter(c => c.status === 'completed' || c.status === 'missed').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhum histórico</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Materials section
  const renderMaterialsSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Materiais</h2>
        {profile?.role === 'admin' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="transition-all hover:scale-105" data-testid="button-upload-material">
                <Upload className="mr-2 h-4 w-4" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Material</DialogTitle>
                <DialogDescription>
                  Faça upload de um novo material para os alunos.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                toast({
                  title: "Material adicionado!",
                  description: "O material foi disponibilizado para os alunos.",
                });
                (e.target).reset();
              }}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="material-title">Título</Label>
                    <Input 
                      id="material-title" 
                      name="material-title"
                      placeholder="Nome do material" 
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="material-category">Categoria</Label>
                    <Select name="material-category">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grammar">Gramática</SelectItem>
                        <SelectItem value="vocabulary">Vocabulário</SelectItem>
                        <SelectItem value="listening">Listening</SelectItem>
                        <SelectItem value="speaking">Speaking</SelectItem>
                        <SelectItem value="reading">Reading</SelectItem>
                        <SelectItem value="writing">Writing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="material-level">Nível</Label>
                    <Select name="material-level">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="elementary">Básico</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="material-file">Arquivo</Label>
                    <Input type="file" id="material-file" name="material-file" accept=".pdf,.doc,.docx,.ppt,.pptx" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="transition-all hover:scale-105">
                    Adicionar Material
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <MaterialsGrid toast={toast} />
    </div>
  );

  // Student schedule section with real API data (P7 + P5)
  const renderStudentScheduleSection = () => {
    const classes = studentClasses;
    const loadingClasses = loadingStudentClasses;
    const now = new Date();
    const upcoming = classes.filter(c => new Date(c.scheduled_at) >= now).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    const past = classes.filter(c => new Date(c.scheduled_at) < now).sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)).slice(0, 5);

    const formatDateTime = (dt) => new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const statusLabel = (s) => ({ scheduled: 'Agendada', completed: 'Concluída', cancelled: 'Cancelada' }[s] ?? s);
    const statusVariant = (s) => ({ scheduled: 'secondary', completed: 'outline', cancelled: 'destructive' }[s] ?? 'outline');

    if (loadingClasses) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <DashboardCardSkeleton key={i} />)}</div>;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" />Minhas Aulas</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Próximas Aulas</CardTitle>
            <CardDescription>Suas aulas agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma aula agendada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                        <Video className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDateTime(cls.scheduled_at)}</p>
                        <p className="text-xs text-muted-foreground">{cls.teacher_name ?? 'Professor'} • {cls.class_type ?? 'Individual'}</p>
                      </div>
                    </div>
                    {cls.meet_link ? (
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => window.open(cls.meet_link, '_blank')}>
                        Entrar
                      </Button>
                    ) : (
                      <Badge variant={statusVariant(cls.status)} className="text-xs">{statusLabel(cls.status)}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Aulas</CardTitle>
            <CardDescription>Suas últimas aulas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula realizada ainda</p>
            ) : (
              <div className="space-y-3">
                {past.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded">
                        <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDateTime(cls.scheduled_at)}</p>
                        <p className="text-xs text-muted-foreground">{cls.teacher_name ?? 'Professor'} • {cls.class_type ?? 'Individual'}</p>
                      </div>
                    </div>
                    <Badge variant={statusVariant(cls.status)} className="text-xs">{statusLabel(cls.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Nivelamento redirect section (P4)
  const renderNivelamentoSection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <span>Teste de Nível</span>
      </h2>
      <Card className="max-w-lg">
        <CardContent className="p-6 space-y-4">
          <p className="text-muted-foreground">
            Descubra seu nível atual de inglês com nosso teste de proficiência. Leva menos de 10 minutos e ajuda seu professor a personalizar suas aulas.
          </p>
          <Button className="w-full" onClick={() => window.location.href = '/nivelamento'}>
            Iniciar Teste de Nível
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // OlivIA section (P3)
  const renderOliviaSection = () => (
    <OlivIA studentName={profile?.full_name} />
  );

  // Fallback para seções sem acesso
  const renderSimpleSection = (title) => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground mb-4">Esta seção não está disponível para seu perfil.</p>
          <Button variant="outline" onClick={() => setActiveSection('dashboard')}>
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        if (profile?.role === 'admin') {
          return (
            <Suspense fallback={<ComponentLoadingFallback message="Carregando dashboard de administrador..." />}>
              <LazyAdminDashboard isLoading={isLoading} setActiveSection={setActiveSection} />
            </Suspense>
          );
        }
        if (profile?.role === 'teacher') {
          return (
            <Suspense fallback={<ComponentLoadingFallback message="Carregando dashboard do professor..." />}>
              <LazyTeacherDashboard isLoading={isLoading} setActiveSection={setActiveSection} />
            </Suspense>
          );
        }
        if (profile?.role === 'student') {
          return (
            <Suspense fallback={<ComponentLoadingFallback message="Carregando dashboard do aluno..." />}>
              <LazyStudentDashboard isLoading={isLoading} setActiveSection={setActiveSection} />
            </Suspense>
          );
        }
        return renderSimpleSection('Dashboard');
      case 'messages':
        return (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando mensagens..." />}>
            <LazyMessageCenter userRole={profile?.role} userName={profile?.full_name} />
          </Suspense>
        );
      case 'progress':
        return profile?.role === 'student' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando progresso..." />}>
            <LazyProgressTracker studentName={profile?.full_name} />
          </Suspense>
        ) : renderSimpleSection('Progresso');
      case 'calendar':
        return (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando calendário..." />}>
            <LazySmartCalendar userRole={profile?.role} userName={profile?.full_name} />
          </Suspense>
        );
      case 'feedback':
        return profile?.role === 'student' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando feedback..." />}>
            <LazyStudentFeedback studentName={profile?.full_name} />
          </Suspense>
        ) : (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando sistema de feedback..." />}>
            <LazyFeedbackSystem userRole={profile?.role} userName={profile?.full_name} />
          </Suspense>
        );
      case 'support':
        return (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando suporte..." />}>
            <LazyChatSupport userRole={profile?.role} userName={profile?.full_name} />
          </Suspense>
        );
      case 'payments':
        return (profile?.role === 'student' || profile?.role === 'admin') ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando sistema de pagamentos..." />}>
            <LazyPaymentSystem userRole={profile?.role} userName={profile?.full_name} profileId={profile?.id} />
          </Suspense>
        ) : renderSimpleSection('Pagamentos');
      case 'users':
      case 'user-management':
        return profile?.role === 'admin' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando gestão de usuários..." />}>
            <LazyUserManagement userRole={profile?.role} />
          </Suspense>
        ) : renderSimpleSection('Gestão de Usuários');
      case 'system-settings':
        return profile?.role === 'admin' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando configurações do sistema..." />}>
            <LazySystemSettings userRole={profile?.role} />
          </Suspense>
        ) : renderSimpleSection('Configurações do Sistema');
      case 'teacher-students':
        return profile?.role === 'teacher' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando gestão de alunos..." />}>
            <LazyTeacherStudentManagement teacherName={profile?.full_name} />
          </Suspense>
        ) : renderSimpleSection('Meus Alunos');
      case 'teacher-classes':
        return profile?.role === 'teacher' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando gestão de aulas..." />}>
            <LazyClassManagement teacherName={profile?.full_name} />
          </Suspense>
        ) : renderSimpleSection('Gestão de Aulas');
      case 'reschedules':
        return (profile?.role === 'admin' || profile?.role === 'teacher') ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando gestão de reagendamentos..." />}>
            <LazyRescheduleManagement 
              userRole={profile?.role} 
              teacherId={profile?.role === 'teacher' ? profile?.id : undefined}
            />
          </Suspense>
        ) : renderSimpleSection('Gerenciar Reagendamentos');
      case 'learning-path':
        return profile?.role === 'student' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando trilha de aprendizado..." />}>
            <LazyLearningPath studentName={profile?.full_name} />
          </Suspense>
        ) : renderSimpleSection('Trilha de Aprendizado');
      case 'study-materials':
        return profile?.role === 'student' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando materiais de estudo..." />}>
            <LazyStudyMaterials studentLevel="Intermediate" />
          </Suspense>
        ) : renderSimpleSection('Materiais de Estudo');
      case 'meet-links':
        return profile?.role === 'teacher' ? renderMeetLinksSection() : renderSimpleSection('Links Google Meet');
      case 'students':
        return profile?.role === 'admin' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando gestão de alunos..." />}>
            <LazyStudentManagement userRole={profile?.role} />
          </Suspense>
        ) : profile?.role === 'teacher' ? renderSimpleSection('Meus Alunos') : renderSimpleSection('Alunos');
      case 'teachers':
        return profile?.role === 'admin' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando gestão de professores..." />}>
            <LazyTeacherManagement userRole={profile?.role} />
          </Suspense>
        ) : renderSimpleSection('Professores');
      case 'classes':
        return profile?.role === 'student' ? renderStudentClassesSection() : renderClassesSection();
      case 'schedule':
        return profile?.role === 'teacher' ? renderScheduleManagementSection() : renderStudentScheduleSection();
      case 'nivelamento':
        return renderNivelamentoSection();
      case 'olivia':
        return renderOliviaSection();
      case 'reschedule':
        return profile?.role === 'student' ? renderRescheduleSection() : (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando remarcações..." />}>
            <LazyRescheduleManagement userRole={profile?.role} teacherId={profile?.role === 'teacher' ? profile?.id : undefined} />
          </Suspense>
        );
      case 'announcements':
        return <AnnouncementsSection userRole={profile?.role} userId={profile?.id} />;
      case 'materials':
        return renderMaterialsSection();
      case 'forum':
        return (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando fórum..." />}>
            <LazyForumSection userRole={profile?.role} userName={profile?.full_name} />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando perfil..." />}>
            <LazyUserProfile userRole={profile?.role} profile={profile} />
          </Suspense>
        );
      case 'reports':
        return profile?.role === 'admin' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando relatórios..." />}>
            <LazyAdvancedReports userRole={profile?.role} />
          </Suspense>
        ) : renderSimpleSection('Relatórios');
      case 'earnings':
        return profile?.role === 'teacher' ? (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando painel de ganhos..." />}>
            <LazyTeacherEarnings teacherId={profile?.id} teacherName={profile?.full_name} />
          </Suspense>
        ) : renderSimpleSection('Valores');
      case 'availability':
        return profile?.role === 'teacher' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Gerenciar Disponibilidade</h2>
            <Suspense fallback={<ComponentLoadingFallback message="Carregando disponibilidade..." />}>
              <LazyTeacherAvailability teacherId={profile?.id} />
            </Suspense>
          </div>
        ) : renderSimpleSection('Disponibilidade');
      case 'settings':
        return (
          <Suspense fallback={<ComponentLoadingFallback message="Carregando configurações..." />}>
            <LazyUserSettings userRole={profile?.role} profile={profile} />
          </Suspense>
        );
      default:
        if (profile?.role === 'admin') {
          return (
            <Suspense fallback={<ComponentLoadingFallback message="Carregando dashboard de administrador..." />}>
              <LazyAdminDashboard isLoading={isLoading} setActiveSection={setActiveSection} />
            </Suspense>
          );
        }
        if (profile?.role === 'teacher') {
          return (
            <Suspense fallback={<ComponentLoadingFallback message="Carregando dashboard do professor..." />}>
              <LazyTeacherDashboard isLoading={isLoading} setActiveSection={setActiveSection} />
            </Suspense>
          );
        }
        if (profile?.role === 'student') {
          return (
            <Suspense fallback={<ComponentLoadingFallback message="Carregando dashboard do aluno..." />}>
              <LazyStudentDashboard isLoading={isLoading} setActiveSection={setActiveSection} />
            </Suspense>
          );
        }
        return renderSimpleSection('Dashboard');
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
      <MobileOptimizations />
    </DashboardLayout>
  );
}