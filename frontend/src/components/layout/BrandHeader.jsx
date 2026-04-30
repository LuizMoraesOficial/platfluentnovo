import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import beFluentLogo from '@/assets/be-fluent-logo-brand.png';
import { useAuth } from '@/hooks/useAuth';

const NAV_LINKS = [
  { label: 'Método',      href: '#method'   },
  { label: 'Resultados',  href: '#results'  },
  { label: 'Depoimentos', href: '#testimonials' },
  { label: 'Planos',      href: '#plans'    },
  { label: 'FAQ',         href: '#faq'      },
];

function scrollTo(href) {
  if (href.startsWith('#')) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function BrandHeader({
  showLoginButton = true,
  onMenuClick,
  showMenuButton = false,
  rightContent,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close mobile menu on resize to desktop */
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const headerBg = scrolled
    ? 'bg-[#0a0a0c]/95 backdrop-blur-md border-b border-white/[0.06] shadow-[0_2px_24px_rgba(0,0,0,0.6)]'
    : 'bg-[#050506]/80 backdrop-blur-sm border-b border-white/[0.04]';

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-[60px] sm:h-16 md:h-[68px]">

            {/* ── Logo ── */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 group shrink-0 min-w-0"
              data-testid="img-logo"
              aria-label="Be Fluent — início"
            >
              <img
                src={beFluentLogo}
                alt="Be Fluent School Logo"
                className="logo-dark h-8 sm:h-10 w-auto object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
              />
              <div className="leading-tight hidden xs:block">
                <span className="block text-white font-black text-[13px] sm:text-[15px] tracking-tight"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Be Fluent
                </span>
                <span className="block text-[#E59313] text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] uppercase -mt-0.5">
                  Performance English
                </span>
              </div>
            </button>

            {/* ── Desktop nav ── */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Navegação principal">
              {NAV_LINKS.map(link => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="px-4 py-2 rounded-lg text-[13.5px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* ── Right side ── */}
            <div className="flex items-center gap-2">
              {rightContent}

              <button
                onClick={() => navigate('/nivelamento')}
                className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] hover:border-white/[0.2] text-white text-[13px] font-semibold px-4 py-2 transition-all duration-200"
              >
                Teste de Nivelamento
              </button>

              {showLoginButton && (
                <button
                  onClick={() => navigate('/auth')}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.2] text-white text-[13px] font-semibold px-4 py-2 transition-all duration-200"
                  data-testid="button-login"
                >
                  Entrar
                </button>
              )}

              <button
                onClick={ctaClick}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#E59313] hover:bg-[#f0a020] text-white text-[12px] sm:text-[13px] font-black px-3.5 sm:px-5 py-2 sm:py-2.5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(229,147,19,0.5)] whitespace-nowrap"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <span className="hidden sm:inline">Agendar Diagnóstico</span>
                <span className="sm:hidden">Agendar</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              </button>

              {/* Hamburger — mobile */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                aria-label="Abrir menu"
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>

        {/* ── Mobile drawer ── */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}
          style={{ background: 'rgba(8,8,10,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <nav className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-1" aria-label="Menu mobile">
            {NAV_LINKS.map(link => (
              <button
                key={link.href}
                onClick={() => { scrollTo(link.href); setMobileOpen(false); }}
                className="text-left px-4 py-3 rounded-xl text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                {link.label}
              </button>
            ))}
            {showLoginButton && (
              <>
                <button
                  onClick={() => { navigate('/nivelamento'); setMobileOpen(false); }}
                  className="mt-2 text-left px-4 py-3 rounded-xl text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  Teste de Nivelamento
                </button>
                <button
                  onClick={() => { navigate('/auth'); setMobileOpen(false); }}
                  className="mt-2 text-left px-4 py-3 rounded-xl text-[14px] font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                  data-testid="button-login-mobile"
                >
                  Entrar na plataforma
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* spacer so content isn't hidden under fixed header */}
      <div className="h-16 md:h-[68px]" />
    </>
  );
}

/* standalone helper used inside this file's CTA button */
function ctaClick() {
  window.open('https://wa.me/5598985332458', '_blank');
}
