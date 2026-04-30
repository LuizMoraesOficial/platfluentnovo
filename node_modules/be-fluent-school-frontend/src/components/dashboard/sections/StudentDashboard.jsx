import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, BookOpen, CheckCircle, Clock, Video, ArrowUpRight, Trophy, Zap } from 'lucide-react';

function SkillBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, color: '#86868e', fontFamily: 'DM Sans, Poppins, sans-serif' }}>{label}</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 500, color }}>{value}%</span>
      </div>
      <div className="dash-track">
        <div className="dash-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function fmtTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function StudentDashboard({ isLoading, setActiveSection }) {
  const { profile } = useAuth();

  const { data: classes = [] } = useQuery({
    queryKey: ['/api/classes/student', profile?.id],
    queryFn: () => import('@/lib/queryClient').then(m => m.apiRequest(`/classes/student/${profile.id}`)),
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 2,
  });

  const { data: progress } = useQuery({
    queryKey: ['/api/progress', profile?.id],
    queryFn: () => import('@/lib/queryClient').then(m => m.apiRequest(`/progress/${profile.id}`)),
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[0,1,2,3].map(i => <div key={i} className="dash-card animate-pulse" style={{ height: 140, animationDelay: `${i*60}ms` }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[0,1].map(i => <div key={i} className="dash-card animate-pulse" style={{ height: 200 }} />)}
        </div>
      </div>
    );
  }

  const upcoming = classes
    .filter(c => c.status === 'scheduled' && new Date(c.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const nextClass = upcoming[0];
  const nextLabel = nextClass ? `${fmtDay(nextClass.scheduled_at)} ${fmtTime(nextClass.scheduled_at)}` : '—';
  const nextCaption = nextClass
    ? `${nextClass.class_type || 'Individual'}${nextClass.teacher_name ? ' · ' + nextClass.teacher_name : ''}`
    : 'nenhuma agendada';

  const completedThisMonth = classes.filter(c => {
    if (c.status !== 'completed') return false;
    const d = new Date(c.scheduled_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalThisMonth = classes.filter(c => {
    const d = new Date(c.scheduled_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const level = profile?.english_level || profile?.student_level || '—';
  const levelLabel = { beginner: 'A1/A2', elementary: 'A2/B1', intermediate: 'B1/B2', advanced: 'C1/C2' }[level] || level;

  const kpis = [
    { icon: Calendar,    value: nextLabel,            label: 'Próxima Aula',  caption: nextCaption,                                color: '#3b82f6', section: 'schedule',     test: 'card-next-class' },
    { icon: BookOpen,    value: levelLabel,            label: 'Nível Atual',   caption: level,                                      color: '#E59313', section: 'learning-path', test: 'card-current-level' },
    { icon: CheckCircle, value: completedThisMonth.length, label: 'Concluídas',caption: 'este mês',                                 color: '#22c55e', section: 'payments',     test: 'card-monthly-payment' },
    { icon: Trophy,      value: totalThisMonth.length, label: 'Aulas/Mês',    caption: `${completedThisMonth.length} concluídas`,  color: '#a855f7', section: 'schedule',     test: 'card-classes-this-month' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        <style>{`@media(min-width:1024px){.student-kpi-grid{grid-template-columns:repeat(4,1fr)!important}}`}</style>
        <div style={{ display: 'contents' }} className="student-kpi-grid">
          {kpis.map(({ icon: Icon, value, label, caption, color, section, test }, i) => (
            <button
              key={test}
              className={`db-kpi da${i + 1}`}
              style={{ '--kpi-accent': color + '30' }}
              onClick={() => setActiveSection?.(section)}
              data-testid={test}
            >
              <ArrowUpRight className="db-kpi-arrow" style={{ width: 13, height: 13 }} />
              <div className="db-kpi-icon" style={{ background: color + '12', borderColor: color + '25', color }}>
                <Icon style={{ width: 15, height: 15 }} />
              </div>
              <div className="db-kpi-num">{value}</div>
              <div className="db-kpi-label">{label}</div>
              <div className="db-kpi-caption">{caption}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Second row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <style>{`@media(max-width:767px){.student-second{grid-template-columns:1fr!important}}`}</style>

        {/* Upcoming classes */}
        <div
          className="db-panel da5 student-second"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveSection?.('schedule')}
          data-testid="card-upcoming-classes"
        >
          <div className="db-panel-inner">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="db-panel-title">Próximas Aulas</div>
                <div className="db-panel-sub">Aulas agendadas</div>
              </div>
              <ArrowUpRight style={{ width: 13, height: 13, color: '#42424a' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#42424a', fontSize: 12 }}>
                  Nenhuma aula agendada
                </div>
              ) : upcoming.slice(0, 3).map((cls, idx) => {
                const isToday = fmtDay(cls.scheduled_at) === 'Hoje';
                return idx === 0 ? (
                  <div key={cls.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 9,
                    background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="db-icon" style={{ width: 30, height: 30, background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                        <Video style={{ width: 13, height: 13 }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#eeeef0', lineHeight: 1.2 }}>{fmtDay(cls.scheduled_at)} {fmtTime(cls.scheduled_at)}</p>
                        <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                          {cls.class_type || 'Individual'}{cls.teacher_name ? ' · ' + cls.teacher_name : ''}
                        </p>
                      </div>
                    </div>
                    {isToday && cls.meet_link ? (
                      <button
                        className="db-cta"
                        style={{ fontSize: 11, padding: '5px 12px', background: '#3b82f6' }}
                        onClick={e => { e.stopPropagation(); window.open(cls.meet_link, '_blank'); }}
                        data-testid="button-enter-class"
                      >
                        <Zap style={{ width: 11, height: 11 }} /> Entrar
                      </button>
                    ) : (
                      <span className="db-pill neutral" style={{ fontSize: 10 }}>agendada</span>
                    )}
                  </div>
                ) : (
                  <div key={cls.id} className="db-row" style={{ padding: '9px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="db-icon" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)', color: '#42424a' }}>
                        <Calendar style={{ width: 12, height: 12 }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#eeeef0', lineHeight: 1.2 }}>{fmtDay(cls.scheduled_at)} {fmtTime(cls.scheduled_at)}</p>
                        <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                          {cls.class_type || 'Individual'}{cls.teacher_name ? ' · ' + cls.teacher_name : ''}
                        </p>
                      </div>
                    </div>
                    <span className="db-pill neutral" style={{ fontSize: 10 }}>agendada</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div
          className="db-panel da6"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveSection?.('progress')}
          data-testid="card-student-progress"
        >
          <div className="db-panel-inner">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="db-panel-title">Progresso</div>
                <div className="db-panel-sub">Evolução no aprendizado</div>
              </div>
              <ArrowUpRight style={{ width: 13, height: 13, color: '#42424a' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SkillBar label="Grammar"    value={progress?.grammar    ?? 0} color="#22c55e" />
              <SkillBar label="Vocabulary" value={progress?.vocabulary ?? 0} color="#E59313" />
              <SkillBar label="Speaking"   value={progress?.speaking   ?? 0} color="#3b82f6" />
              <SkillBar label="Listening"  value={progress?.listening  ?? 0} color="#a855f7" />
            </div>

            {(() => {
              const vals = [progress?.grammar, progress?.vocabulary, progress?.speaking, progress?.listening].filter(v => v != null);
              const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9.5, color: '#252529', letterSpacing: '0.08em' }}>MÉDIA GERAL</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 60, height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${avg}%`, height: '100%', background: '#E59313', borderRadius: 99 }} />
                    </div>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 500, color: '#E59313' }}>{avg}%</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
