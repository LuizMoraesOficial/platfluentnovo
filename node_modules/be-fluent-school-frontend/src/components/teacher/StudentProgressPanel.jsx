import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Clock, BookOpen, Award, Send, ChevronDown, ChevronUp, Loader2, Star, FileText, Mic, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const BF_MODULES = [
  { id: 'S1', label: 'S1', cefr: 'A1', level: 'Start' },
  { id: 'S2', label: 'S2', cefr: 'A1', level: 'Start' },
  { id: 'S3', label: 'S3', cefr: 'A2', level: 'Start' },
  { id: 'I1', label: 'I1', cefr: 'B1', level: 'Intermediate' },
  { id: 'I2', label: 'I2', cefr: 'B1', level: 'Intermediate' },
  { id: 'I3', label: 'I3', cefr: 'B2', level: 'Intermediate' },
  { id: 'AD1', label: 'AD1', cefr: 'B2', level: 'Advanced' },
  { id: 'AD2', label: 'AD2', cefr: 'C1', level: 'Advanced' },
  { id: 'AD3', label: 'AD3', cefr: 'C1', level: 'Advanced' },
  { id: 'AD4', label: 'AD4', cefr: 'C2', level: 'Advanced (Extra)' },
];

const EXAM_MILESTONES = [6, 11, 20];
const MILESTONE_LABELS = { 6: 'Prova 1', 11: 'Prova 2', 20: 'Prova Final (Módulo)' };

function ActivityDot({ number, status, onClick }) {
  const isMilestone = EXAM_MILESTONES.includes(number);
  const cfg = {
    completed: { bg: '#22c55e', border: '#22c55e', icon: CheckCircle2 },
    in_progress: { bg: 'rgba(229,147,19,0.15)', border: '#E59313', icon: Clock },
    not_started: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', icon: Circle },
  }[status] || { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', icon: Circle };

  const Icon = cfg.icon;
  return (
    <button
      title={`Atividade ${number}${isMilestone ? ' — Marco de Prova' : ''}`}
      onClick={() => onClick(number, status)}
      style={{
        width: 36, height: 36, borderRadius: 8, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative',
        background: cfg.bg, border: `1.5px solid ${cfg.border}`,
        transition: 'all 0.15s', gap: 1,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: status === 'completed' ? '#fff' : '#86868e', fontWeight: 600 }}>{number}</span>
      {isMilestone && (
        <span style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, borderRadius: '50%', background: '#E59313', border: '1.5px solid #111115' }} />
      )}
    </button>
  );
}

function ExamCard({ exam, onUpdate, teacherId }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [score, setScore] = useState(String(exam.score ?? ''));
  const [feedback, setFeedback] = useState(exam.feedback ?? '');
  const [status, setStatus] = useState(exam.status);
  const [formLink, setFormLink] = useState(exam.form_link ?? '');
  const { toast } = useToast();

  const statusCfg = {
    pending: { label: 'Aguardando', color: '#eab308' },
    in_progress: { label: 'Em andamento', color: '#3b82f6' },
    completed: { label: 'Concluída', color: '#22c55e' },
  }[exam.status] || { label: exam.status, color: '#86868e' };

  const typeIcon = exam.exam_type === 'theoretical' ? FileText : Mic;
  const typeLabel = exam.exam_type === 'theoretical' ? 'Prova Teórica' : 'Análise Performática';
  const TypeIcon = typeIcon;

  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: exam.exam_type === 'theoretical' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TypeIcon style={{ width: 13, height: 13, color: exam.exam_type === 'theoretical' ? '#3b82f6' : '#a855f7' }} />
          </div>
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: '#eeeef0', margin: 0 }}>{typeLabel}</p>
            <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', margin: 0 }}>
              Após atividade {exam.triggered_by_activity} — {MILESTONE_LABELS[exam.triggered_by_activity] || ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {exam.score != null && (
            <span style={{ fontSize: 12, fontWeight: 700, color: exam.score >= 70 ? '#22c55e' : '#ef4444', fontFamily: 'DM Mono, monospace' }}>
              {exam.score}/100
            </span>
          )}
          <span className="db-pill" style={{ background: statusCfg.color + '18', borderColor: statusCfg.color + '35', color: statusCfg.color, fontSize: 9 }}>
            {statusCfg.label}
          </span>
          <button
            onClick={() => setIsEditOpen(true)}
            className="db-ghost"
            style={{ fontSize: 11, gap: 4, padding: '4px 8px' }}
          >
            Editar
          </button>
        </div>
      </div>

      {exam.exam_type === 'theoretical' && exam.form_link && (
        <a href={exam.form_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3b82f6', textDecoration: 'none', marginTop: 4 }}>
          <ExternalLink style={{ width: 11, height: 11 }} /> Abrir Google Forms
        </a>
      )}

      {exam.feedback && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, color: '#86868e', lineHeight: 1.5 }}>{exam.feedback}</p>
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.09)', maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#eeeef0' }}>Atualizar {typeLabel}</DialogTitle>
            <DialogDescription style={{ color: '#42424a' }}>Registre nota e feedback para o aluno.</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>STATUS</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exam.exam_type === 'theoretical' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>LINK GOOGLE FORMS (opcional)</label>
                <Input
                  value={formLink}
                  onChange={e => setFormLink(e.target.value)}
                  placeholder="https://forms.gle/..."
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>NOTA (0–100)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder="Ex: 85"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>FEEDBACK PARA O ALUNO</label>
              <Textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Desempenho, pontos fortes, áreas de melhoria..."
                className="min-h-[90px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0' }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              className="db-cta"
              style={{ gap: 6 }}
              onClick={() => {
                onUpdate(exam.id, {
                  status,
                  score: score !== '' ? Number(score) : null,
                  feedback: feedback || null,
                  form_link: formLink || null,
                });
                setIsEditOpen(false);
              }}
            >
              <Send style={{ width: 13, height: 13 }} />
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StudentProgressPanel({ student }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editActivity, setEditActivity] = useState(null); // { number, currentStatus }

  const moduleId = student.current_module || 'S1';
  const moduleInfo = BF_MODULES.find(m => m.id === moduleId) || BF_MODULES[0];

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/activity-progress', student.id, moduleId],
    queryFn: () => apiRequest(`/activity-progress/${student.id}?moduleId=${moduleId}`),
    enabled: isExpanded && !!student.id,
    staleTime: 30_000,
  });

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['/api/exams/student', student.id],
    queryFn: () => apiRequest(`/exams/student/${student.id}`),
    enabled: isExpanded && !!student.id,
    staleTime: 30_000,
  });

  const activityMutation = useMutation({
    mutationFn: (data) => apiRequest('/activity-progress', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity-progress', student.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      if (res?.milestone?.triggered) {
        toast({ title: '🎯 Marco atingido!', description: 'Aviso de prova teórica enviado ao aluno.' });
      }
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const examMutation = useMutation({
    mutationFn: ({ examId, data }) => apiRequest(`/exams/${examId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exams/student', student.id] });
      toast({ title: 'Prova atualizada!' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const getActivityStatus = (number) => {
    const row = activities.find(a => a.activity_number === number);
    return row?.status || 'not_started';
  };

  const completedCount = activities.filter(a => a.status === 'completed').length;
  const progressPct = Math.round((completedCount / 20) * 100);

  const handleActivityClick = (number, currentStatus) => {
    setEditActivity({ number, currentStatus });
  };

  const handleActivityStatusChange = (newStatus) => {
    if (!editActivity) return;
    activityMutation.mutate({
      student_id: student.id,
      module_id: moduleId,
      activity_number: editActivity.number,
      status: newStatus,
    });
    setEditActivity(null);
  };

  return (
    <div className="db-panel da1" style={{ marginTop: 0 }}>
      <div className="db-panel-inner">
        {/* Header — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(229,147,19,0.12)', border: '1px solid rgba(229,147,19,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen style={{ width: 15, height: 15, color: '#E59313' }} />
            </div>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: '#eeeef0', margin: 0 }}>{student.full_name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span className="db-pill" style={{ background: 'rgba(229,147,19,0.1)', borderColor: 'rgba(229,147,19,0.3)', color: '#E59313', fontSize: 9 }}>
                  {moduleId} — {moduleInfo.cefr}
                </span>
                <span style={{ fontSize: 11, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
                  Ativ. {student.current_activity || 1}/20
                </span>
                <span style={{ fontSize: 11, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
                  {progressPct}% módulo
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="db-ghost"
            style={{ gap: 4, fontSize: 11 }}
          >
            {isExpanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
            {isExpanded ? 'Fechar' : 'Detalhes'}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 10, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #E59313, #d4830f)', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Activity grid */}
            <div>
              <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#42424a', marginBottom: 10 }}>
                ATIVIDADES — {moduleId} ({completedCount}/20 concluídas) · Clique para ajustar status
              </p>
              {activitiesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                  <Loader2 style={{ width: 16, height: 16, color: '#E59313' }} className="animate-spin" />
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                      <ActivityDot key={n} number={n} status={getActivityStatus(n)} onClick={handleActivityClick} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {[
                      { label: 'Concluída', color: '#22c55e' },
                      { label: 'Em andamento', color: '#E59313' },
                      { label: 'Pendente', color: '#42424a' },
                      { label: '⭐ Marco de prova', color: '#E59313' },
                    ].map(({ label, color }) => (
                      <span key={label} style={{ fontSize: 10, color, fontFamily: 'DM Mono, monospace' }}>{label}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Exams */}
            <div>
              <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#42424a', marginBottom: 10 }}>
                PROVAS — {moduleId}
              </p>
              {examsLoading ? (
                <Loader2 style={{ width: 14, height: 14, color: '#E59313' }} className="animate-spin" />
              ) : exams.length === 0 ? (
                <p style={{ fontSize: 12, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
                  Nenhuma prova liberada ainda. Provas são liberadas ao concluir as atividades 6, 11 ou 20.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {exams.map(exam => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      onUpdate={(examId, data) => examMutation.mutate({ examId, data })}
                      teacherId={student.teacher_id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity status edit dialog */}
      <Dialog open={!!editActivity} onOpenChange={(open) => { if (!open) setEditActivity(null); }}>
        <DialogContent style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.09)', maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#eeeef0' }}>Ajustar Atividade {editActivity?.number}</DialogTitle>
            <DialogDescription style={{ color: '#42424a' }}>
              {EXAM_MILESTONES.includes(editActivity?.number) ? '⭐ Marco de prova — ao concluir, a prova teórica será liberada.' : 'Corrija o status manualmente.'}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '8px 0' }}>
            {[
              { value: 'not_started', label: 'Pendente', color: '#42424a' },
              { value: 'in_progress', label: 'Em andamento', color: '#E59313' },
              { value: 'completed', label: 'Concluída', color: '#22c55e' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleActivityStatusChange(opt.value)}
                disabled={activityMutation.isPending}
                style={{
                  padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                  background: editActivity?.currentStatus === opt.value ? opt.color + '20' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${editActivity?.currentStatus === opt.value ? opt.color + '50' : 'rgba(255,255,255,0.08)'}`,
                  color: opt.color, fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                }}
              >
                {activityMutation.isPending ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : opt.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
