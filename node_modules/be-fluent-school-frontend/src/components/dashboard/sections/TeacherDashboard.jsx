import { Calendar, Users, TrendingUp, Clock, MessageSquare, Settings, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeacherAvailability } from '@/components/teacher/TeacherAvailability';

export function TeacherDashboard({ isLoading, setActiveSection }) {
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {[0,1,2,3,4].map(i => <div key={i} className="dash-card animate-pulse" style={{ height: 120, animationDelay: `${i*50}ms` }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="dash-card animate-pulse" style={{ height: 220 }} />
          <div className="dash-card animate-pulse" style={{ height: 220, animationDelay: '70ms' }} />
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Alunos',      value: '23',    caption: 'ver lista',   icon: Users,         color: '#3b82f6', section: 'teacher-students', test: 'card-my-students'   },
    { label: 'Hoje',        value: '8',     caption: 'aulas',       icon: Calendar,      color: '#22c55e', section: 'teacher-classes',  test: 'card-today-classes' },
    { label: 'A Receber',   value: '3.4k',  caption: 'este mês',    icon: TrendingUp,    color: '#E59313', section: 'earnings',         test: 'card-earnings'      },
    { label: 'Remarcações', value: '3',     caption: 'pendentes',   icon: MessageSquare, color: '#ef4444', section: 'reschedules',      test: 'card-rescheduling'  },
    { label: 'Horários',    value: '7',     caption: 'disponíveis', icon: Settings,      color: '#a855f7', section: 'availability',     test: 'card-availability'  },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* KPI row — 5 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        <style>{`@media(min-width:1024px){.teacher-kpi-grid{grid-template-columns:repeat(5,1fr)!important}}`}</style>
        <div style={{ display: 'contents' }} className="teacher-kpi-grid">
          {kpis.map(({ label, value, caption, icon: Icon, color, section, test }, i) => (
            <button
              key={test}
              className={`db-kpi da${i + 1}`}
              style={{ '--kpi-accent': color + '30', padding: 16 }}
              onClick={() => setActiveSection?.(section)}
              data-testid={test}
            >
              <ArrowUpRight className="db-kpi-arrow" style={{ width: 12, height: 12 }} />
              <div className="db-kpi-icon" style={{ background: color + '12', borderColor: color + '25', color, width: 30, height: 30, borderRadius: 8 }}>
                <Icon style={{ width: 13, height: 13 }} />
              </div>
              <div className="db-kpi-num" style={{ fontSize: '1.5rem', marginTop: 14 }}>{value}</div>
              <div className="db-kpi-label" style={{ fontSize: 11 }}>{label}</div>
              <div className="db-kpi-caption">{caption}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <style>{`@media(min-width:1024px){.teacher-main-grid{grid-template-columns:2fr 1fr!important}}`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="teacher-main-grid">

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Upcoming classes */}
            <div className="db-panel da3">
              <div className="db-panel-inner">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <div className="db-panel-title">Próximas Aulas</div>
                    <div className="db-panel-sub">Hoje e amanhã</div>
                  </div>
                  <button className="db-ghost" onClick={() => setActiveSection?.('teacher-classes')}>
                    Ver tudo <ArrowUpRight style={{ width: 10, height: 10 }} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { time: '14:00', name: 'João Silva',  sub: 'Individual · 1h',    color: '#3b82f6', icon: Clock  },
                    { time: '16:00', name: 'Conversação', sub: 'Turma A · 5 alunos', color: '#a855f7', icon: Users  },
                  ].map(({ time, name, sub, color, icon: Icon }) => (
                    <div key={time} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', borderRadius: 9,
                      background: color + '0a', border: `1px solid ${color}1c`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="db-icon" style={{ width: 30, height: 30, background: color + '14', borderColor: color + '22', color }}>
                          <Icon style={{ width: 12, height: 12 }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#eeeef0', lineHeight: 1.2 }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', color }}>{time}</span>
                            {' '}· {name}
                          </p>
                          <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{sub}</p>
                        </div>
                      </div>
                      <span className="db-pill" style={{ background: color + '10', borderColor: color + '28', color, fontSize: 9.5 }}>
                        hoje
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reschedule requests */}
            <div className="db-panel da4">
              <div className="db-panel-inner">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <div className="db-panel-title">Remarcações Pendentes</div>
                    <div className="db-panel-sub">Aguardam aprovação</div>
                  </div>
                  <span className="db-pill red" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>3</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="db-row" style={{ padding: '9px 10px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="db-icon" style={{ width: 28, height: 28, background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        <AlertCircle style={{ width: 12, height: 12 }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 12.5, fontWeight: 500, color: '#eeeef0', lineHeight: 1.2 }}>Carlos Lima</p>
                        <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                          Terça 14:00 → confirmação
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 6,
                          background: 'rgba(34,197,94,0.09)', color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer',
                        }}
                        data-testid="button-approve-reschedule"
                        onClick={() => toast({ title: 'Remarcação aprovada!', description: 'Carlos Lima foi notificado.' })}
                      >
                        Aprovar
                      </button>
                      <button
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 6,
                          background: 'rgba(239,68,68,0.07)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer',
                        }}
                        data-testid="button-reject-reschedule"
                        onClick={() => toast({ title: 'Remarcação rejeitada', description: 'O aluno foi notificado.', variant: 'destructive' })}
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>

                  <button
                    className="db-ghost"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 4, borderStyle: 'dashed' }}
                    onClick={() => setActiveSection?.('reschedules')}
                  >
                    Ver todas as solicitações <ArrowUpRight style={{ width: 10, height: 10 }} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right — availability */}
          <div className="da5">
            <TeacherAvailability />
          </div>
        </div>
      </div>
    </div>
  );
}
