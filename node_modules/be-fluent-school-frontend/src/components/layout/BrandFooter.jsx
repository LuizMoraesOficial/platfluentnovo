import beFluentLogo from '@/assets/be-fluent-logo-brand.png';
import { Mail, Instagram, Phone } from 'lucide-react';

const NAV = [
  { label: 'Método',      href: '#method'       },
  { label: 'Resultados',  href: '#results'      },
  { label: 'Depoimentos', href: '#testimonials' },
  { label: 'Planos',      href: '#plans'        },
  { label: 'FAQ',         href: '#faq'          },
];

function scrollTo(href) {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function BrandFooter({ compact = false }) {
  if (compact) {
    return (
      <footer className="border-t border-white/[0.07] py-4" style={{ background: '#0a0a0c' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-2.5">
              <img
                src={beFluentLogo}
                alt="Be Fluent Performance English"
                className="logo-dark h-8 w-8 object-contain rounded-md"
              />
              <span className="text-white/60 font-semibold text-sm">Be Fluent | Performance English</span>
            </div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} Be Fluent. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer style={{ background: '#080809', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-12 md:gap-16">

          {/* ── Brand ── */}
          <div className="max-w-sm">
            <div className="flex items-center gap-3 mb-5">
              <img
                src={beFluentLogo}
                alt="Be Fluent School Logo"
                className="logo-dark h-11 w-11 object-contain rounded-xl"
              />
              <div>
                <p className="text-white font-black text-base leading-tight"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Be Fluent School
                </p>
                <p className="text-[#E59313] text-[10px] font-bold tracking-[0.14em] uppercase">
                  English Performance
                </p>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-6">
              Desenvolvemos comunicadores de alta performance capazes de falar inglês com
              clareza, segurança e autoridade em qualquer ambiente corporativo.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/befluentschooll"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center border border-white/[0.1] text-white/40 hover:text-[#E59313] hover:border-[#E59313]/40 transition-all duration-200"
                aria-label="Instagram Be Fluent"
                data-testid="link-instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="mailto:befluentschooll@gmail.com"
                className="w-9 h-9 rounded-full flex items-center justify-center border border-white/[0.1] text-white/40 hover:text-[#E59313] hover:border-[#E59313]/40 transition-all duration-200"
                aria-label="E-mail Be Fluent"
                data-testid="link-email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* ── Navigation ── */}
          <div>
            <p className="text-white/25 text-[10px] font-bold tracking-[0.2em] uppercase mb-5">
              Navegação
            </p>
            <ul className="space-y-3">
              {NAV.map(item => (
                <li key={item.href}>
                  <button
                    onClick={() => scrollTo(item.href)}
                    className="text-white/45 hover:text-white text-sm transition-colors duration-200"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ── */}
          <div>
            <p className="text-white/25 text-[10px] font-bold tracking-[0.2em] uppercase mb-5">
              Contato
            </p>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:befluentschooll@gmail.com"
                  className="flex items-center gap-2.5 text-white/45 hover:text-white text-sm transition-colors duration-200"
                  data-testid="link-email-footer"
                >
                  <Mail className="w-4 h-4 shrink-0 text-[#E59313]" />
                  befluentschooll@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/befluentschooll"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-white/45 hover:text-white text-sm transition-colors duration-200"
                  data-testid="link-instagram-footer"
                >
                  <Instagram className="w-4 h-4 shrink-0 text-[#E59313]" />
                  @befluentschooll
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5598985332458"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-white/45 hover:text-white text-sm transition-colors duration-200"
                >
                  <Phone className="w-4 h-4 shrink-0 text-[#E59313]" />
                  Fale via WhatsApp
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-14 pt-7" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/25">
            <p>© {new Date().getFullYear()} Be Fluent School. Todos os direitos reservados.</p>
            <p>Desenvolvido com excelência para profissionais ambiciosos.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
