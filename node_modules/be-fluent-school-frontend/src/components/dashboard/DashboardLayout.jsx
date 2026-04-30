import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar, Users, BookOpen, MessageSquare, Settings, Bell,
  LogOut, Home, Clock, FileText, UserCheck, Video, Trophy,
  Mail, Star, HeadphonesIcon, CreditCard, GraduationCap, Bot,
  BarChart3, ChevronRight, LayoutGrid, PanelLeftOpen,
} from 'lucide-react';
import beFluentLogo from '@/assets/be-fluent-logo-new.png';

const ROLES = {
  admin:   { label: 'Admin',     color: '#E59313' },
  teacher: { label: 'Professor', color: '#3b82f6' },
  student: { label: 'Aluno',     color: '#22c55e' },
};

const LABELS = {
  dashboard: 'Dashboard', messages: 'Mensagens', announcements: 'Avisos',
  calendar: 'Calendário', progress: 'Meu Progresso', schedule: 'Minhas Aulas',
  'study-materials': 'Materiais', payments: 'Pagamentos', feedback: 'Feedbacks',
  forum: 'Fórum', reschedule: 'Remarcação', reschedules: 'Reagendamentos',
  support: 'Suporte', profile: 'Perfil', olivia: 'OlivIA',
  nivelamento: 'Teste de Nível', 'learning-path': 'Trilha', 'user-management': 'Usuários',
  students: 'Alunos', teachers: 'Professores', classes: 'Aulas',
  reports: 'Relatórios', 'system-settings': 'Configurações', 'teacher-classes': 'Minhas Aulas',
  'teacher-students': 'Meus Alunos', 'meet-links': 'Links Meet',
  materials: 'Materiais', earnings: 'Ganhos', availability: 'Disponibilidade',
};

function buildMobileNav(role) {
  if (role === 'admin') return [
    { id: 'dashboard',     label: 'Início',    icon: Home },
    { id: 'students',      label: 'Alunos',    icon: Users },
    { id: 'classes',       label: 'Aulas',     icon: BookOpen },
    { id: 'messages',      label: 'Mensagens', icon: Mail },
    { id: 'system-settings', label: 'Config',  icon: Settings },
  ];
  if (role === 'teacher') return [
    { id: 'dashboard',        label: 'Início',   icon: Home },
    { id: 'teacher-classes',  label: 'Aulas',    icon: BookOpen },
    { id: 'teacher-students', label: 'Alunos',   icon: Users },
    { id: 'messages',         label: 'Msgs',     icon: Mail },
    { id: 'calendar',         label: 'Agenda',   icon: Calendar },
  ];
  return [
    { id: 'dashboard',      label: 'Início',   icon: Home },
    { id: 'schedule',       label: 'Aulas',    icon: Clock },
    { id: 'progress',       label: 'Progresso',icon: Trophy },
    { id: 'messages',       label: 'Msgs',     icon: Mail },
    { id: 'olivia',         label: 'OlivIA',   icon: Bot },
  ];
}

function buildNav(role) {
  const core = { group: null, items: [
    { id: 'dashboard',     label: 'Dashboard',  icon: Home },
    { id: 'messages',      label: 'Mensagens',  icon: Mail },
    { id: 'announcements', label: 'Avisos',     icon: Bell },
  ]};

  if (role === 'admin') return [
    core,
    { group: 'Gestão', items: [
      { id: 'calendar',        label: 'Calendário',    icon: Calendar },
      { id: 'students',        label: 'Alunos',        icon: Users },
      { id: 'teachers',        label: 'Professores',   icon: UserCheck },
      { id: 'classes',         label: 'Aulas',         icon: BookOpen },
      { id: 'user-management', label: 'Usuários',      icon: UserCheck },
    ]},
    { group: 'Analytics', items: [
      { id: 'reports',     label: 'Relatórios',    icon: BarChart3 },
      { id: 'reschedules', label: 'Reagendamentos',icon: Clock },
    ]},
    { group: 'Sistema', items: [
      { id: 'feedback',        label: 'Feedbacks',     icon: Star },
      { id: 'support',         label: 'Suporte',       icon: HeadphonesIcon },
      { id: 'system-settings', label: 'Configurações', icon: Settings },
    ]},
  ];

  if (role === 'teacher') return [
    core,
    { group: 'Aulas', items: [
      { id: 'calendar',         label: 'Calendário',  icon: Calendar },
      { id: 'teacher-classes',  label: 'Minhas Aulas',icon: BookOpen },
      { id: 'teacher-students', label: 'Meus Alunos', icon: UserCheck },
      { id: 'meet-links',       label: 'Links Meet',  icon: Video },
    ]},
    { group: 'Conteúdo', items: [
      { id: 'materials',   label: 'Materiais',   icon: FileText },
      { id: 'reschedules', label: 'Remarcações', icon: Clock },
      { id: 'feedback',    label: 'Feedbacks',   icon: Star },
      { id: 'forum',       label: 'Fórum',       icon: MessageSquare },
      { id: 'support',     label: 'Suporte',     icon: HeadphonesIcon },
    ]},
  ];

  return [
    core,
    { group: 'Aprendizado', items: [
      { id: 'progress',       label: 'Meu Progresso', icon: Trophy },
      { id: 'calendar',       label: 'Calendário',    icon: Calendar },
      { id: 'schedule',       label: 'Minhas Aulas',  icon: Clock },
      { id: 'study-materials',label: 'Materiais',     icon: FileText },
      { id: 'olivia',         label: 'OlivIA',        icon: Bot },
      { id: 'nivelamento',    label: 'Teste de Nível',icon: GraduationCap },
    ]},
    { group: 'Conta', items: [
      { id: 'payments',   label: 'Pagamentos', icon: CreditCard },
      { id: 'feedback',   label: 'Feedbacks',  icon: Star },
      { id: 'forum',      label: 'Fórum',      icon: MessageSquare },
      { id: 'reschedule', label: 'Remarcação', icon: Clock },
      { id: 'support',    label: 'Suporte',    icon: HeadphonesIcon },
    ]},
  ];
}

export function DashboardLayout({ children, activeSection: propSection, onSectionChange }) {
  const { profile, signOut } = useAuth();
  const [local, setLocal] = useState('dashboard');
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);

  const active = propSection ?? local;
  const go = (s) => {
    if (onSectionChange) onSectionChange(s); else setLocal(s);
    setPanelOpen(false);
  };

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  if (!profile) {
    return (
      <div className="dashboard-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2px solid rgba(229,147,19,0.15)',
            borderTopColor: '#E59313',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: '#42424a' }}>
            CARREGANDO
          </span>
        </div>
      </div>
    );
  }

  const role = profile.role ?? 'student';
  const meta = ROLES[role] ?? ROLES.student;
  const nav = buildNav(role);
  const mobileNav = buildMobileNav(role);
  const initials = profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const firstName = profile.full_name.split(' ')[0];

  // Flat list of all items for rail icons
  const allItems = nav.flatMap(g => g.items);
  // Show only first 8 in rail (most important)
  const railItems = allItems.slice(0, 8);

  return (
    <div className="dashboard-dark">
      <div className="db-shell">

        {/* ════════════ Icon Rail ════════════ */}
        <nav className="db-rail">
          {/* Logo */}
          <div className="db-rail-logo" style={{ background: 'transparent', border: 'none', overflow: 'hidden' }}>
            <img src={beFluentLogo} alt="BF" className="logo-dark" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>

          {/* Menu toggle */}
          <button
            className={`db-rail-btn${panelOpen ? ' active' : ''}`}
            onClick={() => setPanelOpen(v => !v)}
            title="Menu"
            style={{ marginBottom: 4 }}
          >
            <LayoutGrid style={{ width: 16, height: 16 }} />
          </button>

          <div className="db-rail-divider" />

          {/* Quick nav icons */}
          {railItems.map(item => (
            <button
              key={item.id}
              className={`db-rail-btn${active === item.id ? ' active' : ''}`}
              onClick={() => go(item.id)}
              data-testid={`nav-${item.id}`}
              title={item.label}
            >
              <item.icon style={{ width: 16, height: 16 }} />
            </button>
          ))}

          {/* Avatar at bottom */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="db-rail-avatar" data-testid="user-profile">
                {initials}
                <span className="presence" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="end"
              style={{
                background: '#151518',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 10,
                padding: 4,
                minWidth: 180,
              }}
            >
              <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#eeeef0', lineHeight: 1.3 }}>{profile.full_name}</p>
                <p style={{ fontSize: 10, color: '#42424a', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{profile.email}</p>
              </div>
              <DropdownMenuItem onClick={() => go('profile')} className="cursor-pointer rounded-md" style={{ color: '#c4c4cc', fontSize: 13 }}>
                <Settings style={{ width: 13, height: 13, marginRight: 8, color: '#42424a' }} />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.06)', margin: '3px 0' }} />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer rounded-md" style={{ color: '#ef4444', fontSize: 13 }}>
                <LogOut style={{ width: 13, height: 13, marginRight: 8 }} />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* ════════════ Slide-over Nav Panel ════════════ */}
        <div ref={panelRef} className={`db-nav-panel${panelOpen ? ' open' : ''}`}>
          <div className="db-nav-header">
            <p className="db-nav-brand">Be Fluent</p>
            <span className="db-nav-role" style={{ '--role-color': meta.color }}>
              {meta.label}
            </span>
          </div>

          <div className="db-nav-scroll">
            {nav.map((section, si) => (
              <div key={si}>
                {section.group && (
                  <div className="db-nav-group-label">{section.group}</div>
                )}
                {section.items.map(item => {
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`db-nav-item${isActive ? ' active' : ''}`}
                      onClick={() => go(item.id)}
                    >
                      <item.icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                      {item.label}
                      {isActive && <span className="ni-dot" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="db-nav-footer">
            <div className="db-nav-user" onClick={() => { go('profile'); setPanelOpen(false); }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(229,147,19,0.1)', border: '1px solid rgba(229,147,19,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 500, color: '#E59313',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#eeeef0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.full_name}
                </p>
                <p style={{ fontSize: 10, color: '#42424a', marginTop: 1, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════ Main Area ════════════ */}
        <div className="db-main">

          {/* Topbar */}
          <header className="db-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#252529', letterSpacing: '0.07em' }}>
                BE FLUENT
              </span>
              <ChevronRight style={{ width: 10, height: 10, color: '#252529', flexShrink: 0 }} />
              <h1 className="db-topbar-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {LABELS[active] ?? active}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Online pill */}
              <div className="db-topbar-pill" style={{ display: 'none' }} id="online-pill">
                <div className="db-live" />
                ONLINE
              </div>
              <style>{`@media(min-width:640px){#online-pill{display:flex}}`}</style>

              <NotificationCenter userRole={role} />

              {/* User chip */}
              <div className="db-topbar-user">
                <div className="db-topbar-user-avatar">
                  {initials}
                  <span className="db-topbar-user-status" />
                </div>
                <span className="db-topbar-username">
                  {firstName}
                </span>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="db-content">
            {children}
          </div>
        </div>
      </div>

      {/* Panel backdrop on mobile */}
      {panelOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 48, backdropFilter: 'blur(4px)',
          }}
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* ════════════ Mobile Bottom Nav ════════════ */}
      <nav className="db-mobile-nav">
        {mobileNav.map(item => (
          <button
            key={item.id}
            className={`db-mobile-nav-item${active === item.id ? ' active' : ''}`}
            onClick={() => go(item.id)}
            aria-label={item.label}
          >
            <item.icon style={{ width: 20, height: 20 }} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
