import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, Clock, CheckCircle, AlertCircle, Calendar, Loader2, ArrowUpRight } from 'lucide-react';

const fmt = (c) => c
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(c / 100)
  : 'R$ 0';

const fmtDt = (s) => new Date(s).toLocaleString('pt-BR', {
  weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

function KpiCard({ label, value, caption, icon: Icon, color, onClick, anim }) {
  return (
    <button
      className={`db-kpi ${anim}`}
      style={{ '--kpi-accent': color + '30' }}
      onClick={onClick}
    >
      <ArrowUpRight className="db-kpi-arrow" style={{ width: 13, height: 13 }} />
      <div
        className="db-kpi-icon"
        style={{ background: color + '12', borderColor: color + '25', color }}
      >
        <Icon style={{ width: 15, height: 15 }} />
      </div>
      <div className="db-kpi-num">{value}</div>
      <div className="db-kpi-label">{label}</div>
      {caption && <div className="db-kpi-caption">{caption}</div>}
    </button>
  );
}

export function AdminDashboard({ isLoading, setActiveSection }) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: !isLoading,
    staleTime: 60_000,
  });

  const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ['/api/classes/upcoming'],
    enabled: !isLoading,
    staleTime: 60_000,
  });

  if (isLoading || statsLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="dash-card animate-pulse" style={{ height: 140, animationDelay: `${i*60}ms` }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[0,1].map(i => <div key={i} className="dash-card animate-pulse" style={{ height: 180 }} />)}
        </div>
      </div>
    );
  }

  const total   = stats?.totalStudents    ?? 0;
  const teachers= stats?.activeTeachers   ?? 0;
  const revenue = stats?.monthlyRevenue   ?? 0;
  const pending = stats?.pendingPayments  ?? 0;
  const overdue = stats?.overduePayments  ?? 0;
  const classes = stats?.classesThisMonth ?? 0;
  const inDay   = Math.max(0, total - pending - overdue);

  const payColor  = overdue > 0 ? '#ef4444' : pending > 0 ? '#eab308' : '#22c55e';
  const payCaption= overdue > 0 ? `${overdue} atraso · ${pending} pend` : pending > 0 ? `${pending} pendentes` : 'todos em dia';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="lg:grid-cols-4">
        <style>{`@media(min-width:1024px){.admin-kpi-grid{grid-template-columns:repeat(4,1fr)!important}}`}</style>
        <div style={{ display: 'contents' }} className="admin-kpi-grid">
          <KpiCard label="Total Alunos"      value={total}           caption={`${classes} aulas / mês`} icon={Users}       color="#3b82f6" onClick={() => setActiveSection?.('students')} anim="da1" />
          <KpiCard label="Professores"       value={teachers}        caption="ativos"                   icon={Users}       color="#a855f7" onClick={() => setActiveSection?.('teachers')} anim="da2" />
          <KpiCard label="Receita Mensal"    value={fmt(revenue)}    caption={`${classes} concluídas`}  icon={TrendingUp}  color="#22c55e" onClick={() => setActiveSection?.('reports')}  anim="da3" />
          <KpiCard label="Pagamentos"        value={pending + overdue} caption={payCaption}             icon={AlertCircle} color={payColor} onClick={() => setActiveSection?.('payments')} anim="da4" />
        </div>
      </div>

      {/* Second row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <style>{`@media(max-width:767px){.admin-second-row{grid-template-columns:1fr!important}}`}</style>

        {/* Payment status */}
        <div className="db-panel da5 admin-second-row">
          <div className="db-panel-inner">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="db-panel-title">Mensalidades</div>
                <div className="db-panel-sub">Situação dos alunos</div>
              </div>
              <button className="db-ghost" onClick={() => setActiveSection?.('payments')}>
                Ver <ArrowUpRight style={{ width: 10, height: 10 }} />
              </button>
            </div>

            {total === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
                <TrendingUp style={{ width: 24, height: 24, color: '#252529', opacity: 0.5 }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#42424a' }}>sem dados</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Em dia',    count: inDay,   color: '#22c55e', icon: CheckCircle },
                  { label: 'Pendentes', count: pending,  color: '#eab308', icon: Clock },
                  ...(overdue > 0 ? [{ label: 'Em atraso', count: overdue, color: '#ef4444', icon: AlertCircle }] : []),
                ].map(({ label, count, color, icon: Icon }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Icon style={{ width: 12, height: 12, color }} />
                        <span style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 500, color }}>{count}</span>
                    </div>
                    <div className="dash-track">
                      <div className="dash-fill" style={{ width: total ? `${(count / total) * 100}%` : '0%', background: color }} />
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9.5, color: '#252529', letterSpacing: '0.08em' }}>TOTAL</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: '#eeeef0' }}>{total}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming classes */}
        <div className="db-panel da6">
          <div className="db-panel-inner">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="db-panel-title">Próximas Aulas</div>
                <div className="db-panel-sub">48 horas à frente</div>
              </div>
              {!upcomingLoading && upcoming.length > 0 && (
                <span className="db-pill neutral" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{upcoming.length}</span>
              )}
            </div>

            {upcomingLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Loader2 style={{ width: 16, height: 16, color: '#E59313' }} className="animate-spin" />
              </div>
            ) : upcoming.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
                <Calendar style={{ width: 24, height: 24, color: '#252529', opacity: 0.5 }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#42424a' }}>nenhuma aula</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {upcoming.slice(0, 5).map(cls => (
                  <div key={cls.id} className="db-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div className="db-icon" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)', color: '#42424a', flexShrink: 0 }}>
                        <Calendar style={{ width: 12, height: 12 }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#eeeef0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cls.student_name ?? 'Aluno'}
                        </p>
                        <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                          {cls.teacher_name ?? 'A definir'}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 500, color: '#86868e', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                        {fmtDt(cls.scheduled_at)}
                      </p>
                      <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
                        {cls.duration_minutes ?? 60}min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
