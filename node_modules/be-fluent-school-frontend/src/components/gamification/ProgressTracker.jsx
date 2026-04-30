import { useQuery } from '@tanstack/react-query';
import { Trophy, BookOpen, CheckCircle2, Clock, Circle, Star, FileText, Mic, Loader2, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

const BF_MODULES = [
  { id: 'S1', cefr: 'A1', level: 'Start' }, { id: 'S2', cefr: 'A1', level: 'Start' }, { id: 'S3', cefr: 'A2', level: 'Start' },
  { id: 'I1', cefr: 'B1', level: 'Intermediate' }, { id: 'I2', cefr: 'B1', level: 'Intermediate' }, { id: 'I3', cefr: 'B2', level: 'Intermediate' },
  { id: 'AD1', cefr: 'B2', level: 'Advanced' }, { id: 'AD2', cefr: 'C1', level: 'Advanced' }, { id: 'AD3', cefr: 'C1', level: 'Advanced' }, { id: 'AD4', cefr: 'C2', level: 'Advanced' },
];

const EXAM_MILESTONES = [6, 11, 20];
const MILESTONE_LABELS = { 6: 'Prova 1', 11: 'Prova 2', 20: 'Prova Final' };

const CEFR_COLORS = { A1: '#22c55e', A2: '#84cc16', B1: '#eab308', B2: '#f97316', C1: '#ef4444', C2: '#a855f7' };

function ActivityBubble({ number, status }) {
  const isMilestone = EXAM_MILESTONES.includes(number);
  const cfg = {
    completed: { bg: '#22c55e', color: '#fff', border: '#22c55e' },
    in_progress: { bg: 'rgba(229,147,19,0.18)', color: '#E59313', border: '#E59313' },
    not_started: { bg: 'rgba(255,255,255,0.04)', color: '#42424a', border: 'rgba(255,255,255,0.08)' },
  }[status] || { bg: 'rgba(255,255,255,0.04)', color: '#42424a', border: 'rgba(255,255,255,0.08)' };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cfg.bg, border: `1.5px solid ${cfg.border}`,
        fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: cfg.color,
      }}>
        {status === 'completed' ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : number}
      </div>
      {isMilestone && (
        <span style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: '#E59313', lineHeight: 1 }}>
          {MILESTONE_LABELS[number]}
        </span>
      )}
    </div>
  );
}

export function ProgressTracker() {
  const { profile } = useAuth();
  const studentId = profile?.id;
  const moduleId = profile?.current_module || 'S1';
  const moduleInfo = BF_MODULES.find(m => m.id === moduleId) || BF_MODULES[0];
  const cefrColor = CEFR_COLORS[moduleInfo.cefr] || '#E59313';

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/activity-progress', studentId, moduleId],
    queryFn: () => apiRequest(`/activity-progress/${studentId}?moduleId=${moduleId}`),
    enabled: !!studentId,
    staleTime: 60_000,
  });

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['/api/exams/student', studentId],
    queryFn: () => apiRequest(`/exams/student/${studentId}`),
    enabled: !!studentId,
    staleTime: 60_000,
  });

  const getStatus = (n) => activities.find(a => a.activity_number === n)?.status || 'not_started';
  const completedCount = activities.filter(a => a.status === 'completed').length;
  const currentActivity = profile?.current_activity || 1;
  const progressPct = Math.round((completedCount / 20) * 100);

  const moduleExams = exams.filter(e => e.module_id === moduleId);

  if (activitiesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <Loader2 style={{ width: 20, height: 20, color: '#E59313' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div>
        <div className="db-panel-title" style={{ fontSize: 18 }}>Meu Progresso</div>
        <div className="db-panel-sub">Acompanhe sua evolução no currículo Be Fluent</div>
      </div>

      {/* Module hero card */}
      <div className="db-panel da1">
        <div className="db-panel-inner">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: cefrColor + '18', border: `1px solid ${cefrColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen style={{ width: 18, height: 18, color: cefrColor }} />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#eeeef0', margin: 0, lineHeight: 1 }}>{moduleId}</p>
                  <p style={{ fontSize: 12, color: '#86868e', margin: 0 }}>{moduleInfo.level}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="db-pill" style={{ background: cefrColor + '18', borderColor: cefrColor + '35', color: cefrColor, fontSize: 11 }}>
                  CEFR {moduleInfo.cefr}
                </span>
                <span style={{ fontSize: 12, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
                  Atividade {currentActivity}/20
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#eeeef0', margin: 0, lineHeight: 1 }}>{progressPct}%</p>
              <p style={{ fontSize: 11, color: '#42424a', fontFamily: 'DM Mono, monospace', margin: '4px 0 0' }}>{completedCount}/20 concluídas</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }}>
            <div style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${cefrColor}, ${cefrColor}aa)`, width: `${progressPct}%`, transition: 'width 0.5s ease' }} />
          </div>

          {/* Activity grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
              <ActivityBubble key={n} number={n} status={getStatus(n)} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            {[
              { label: 'Concluída', color: '#22c55e' },
              { label: 'Em andamento', color: '#E59313' },
              { label: 'Pendente', color: '#42424a' },
              { label: '⭐ Prova', color: '#E59313' },
            ].map(({ label, color }) => (
              <span key={label} style={{ fontSize: 10, color, fontFamily: 'DM Mono, monospace' }}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Concluídas', value: completedCount, color: '#22c55e', icon: CheckCircle2 },
          { label: 'Em andamento', value: activities.filter(a => a.status === 'in_progress').length, color: '#E59313', icon: Clock },
          { label: 'Provas', value: moduleExams.length, color: '#3b82f6', icon: Award },
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

      {/* Exam section */}
      {(moduleExams.length > 0 || examsLoading) && (
        <div className="db-panel da2">
          <div className="db-panel-inner">
            <p style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a', marginBottom: 12 }}>PROVAS — {moduleId}</p>
            {examsLoading ? (
              <Loader2 style={{ width: 14, height: 14, color: '#E59313' }} className="animate-spin" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {moduleExams.map(exam => {
                  const isTheoretical = exam.exam_type === 'theoretical';
                  const Icon = isTheoretical ? FileText : Mic;
                  const accentColor = isTheoretical ? '#3b82f6' : '#a855f7';
                  const statusCfg = {
                    pending: { label: 'Aguardando', color: '#eab308' },
                    in_progress: { label: 'Em andamento', color: '#3b82f6' },
                    completed: { label: 'Concluída', color: '#22c55e' },
                  }[exam.status] || { label: exam.status, color: '#86868e' };

                  return (
                    <div key={exam.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: exam.feedback ? 8 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon style={{ width: 13, height: 13, color: accentColor }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#eeeef0', margin: 0 }}>
                              {isTheoretical ? 'Prova Teórica' : 'Análise Performática'}
                            </p>
                            <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', margin: 0 }}>
                              {MILESTONE_LABELS[exam.triggered_by_activity] || `Após ativ. ${exam.triggered_by_activity}`}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {exam.score != null && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: exam.score >= 70 ? '#22c55e' : '#ef4444', fontFamily: 'DM Mono, monospace' }}>
                              {exam.score}/100
                            </span>
                          )}
                          <span className="db-pill" style={{ background: statusCfg.color + '18', borderColor: statusCfg.color + '35', color: statusCfg.color, fontSize: 9 }}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      {exam.feedback && (
                        <div style={{ padding: '8px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', marginTop: 8 }}>
                          <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#E59313', marginBottom: 4 }}>FEEDBACK DO PROFESSOR</p>
                          <p style={{ fontSize: 12, color: '#86868e', lineHeight: 1.6, margin: 0 }}>{exam.feedback}</p>
                        </div>
                      )}

                      {isTheoretical && exam.status === 'pending' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <Clock style={{ width: 11, height: 11, color: '#42424a' }} />
                          <span style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
                            Aguardando link do Google Forms do seu professor
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No exams yet — motivational message */}
      {moduleExams.length === 0 && !examsLoading && (
        <div className="db-panel da3">
          <div className="db-panel-inner" style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Trophy style={{ width: 24, height: 24, color: '#252529' }} />
            <p style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a', margin: 0 }}>
              Provas liberadas após concluir as atividades 6, 11 e 20
            </p>
            <p style={{ fontSize: 11, color: '#252529', margin: 0 }}>
              Continue avançando! Você está na atividade {currentActivity}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
