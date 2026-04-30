import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Check, ChevronDown, Target,
  MessageCircle, Briefcase, Plane, Users, Award,
  ChevronLeft, ChevronRight, Star, X, TrendingUp, Globe,
  Menu, Clock, Calendar
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { BrandFooter } from '@/components/layout/BrandFooter';
import { useQuery } from '@tanstack/react-query';
import isabellaFounder from '@/assets/isabella-founder.jpg';
import beFluentLogo from '@/assets/be-fluent-logo-brand.png';
import beFluentBrand from '@/assets/be-fluent-brand.png';
import videoDepoimento1 from '@/assets/video-depoimento-1.mp4';
import videoDepoimento2 from '@/assets/video-depoimento-2.mp4';
import videoDepoimento3 from '@/assets/video-depoimento-3.mp4';

/* ─────────────────────────────────────────────────────────────────
   HONEYCOMB SVG PATTERN
   ───────────────────────────────────────────────────────────────── */
const HoneycombBg = ({ opacity = 0.035, id = 'hx' }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg"
    style={{ opacity }} aria-hidden="true">
    <defs>
      <pattern id={id} x="0" y="0" width="60" height="69.3" patternUnits="userSpaceOnUse">
        <polygon points="30,1 59,17.3 59,52 30,68.3 1,52 1,17.3" fill="none" stroke="#E59313" strokeWidth="0.8" />
        <polygon points="60,35.6 89,52 89,86.6 60,103 31,86.6 31,52" fill="none" stroke="#E59313" strokeWidth="0.8" />
        <polygon points="0,35.6 29,52 29,86.6 0,103 -29,86.6 -29,52" fill="none" stroke="#E59313" strokeWidth="0.8" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
);

const HexCell = ({ size = 80, filled = false, className = '' }) => {
  const r = size / 2, h = r * Math.sqrt(3) / 2;
  const pts = [[r,0],[size,h],[size,h*3],[r,h*4],[0,h*3],[0,h]].map(p=>p.join(',')).join(' ');
  return (
    <svg width={size} height={h*4} viewBox={`0 0 ${size} ${h*4}`} className={className}
      style={{overflow:'visible'}} aria-hidden="true">
      <polygon points={pts} fill={filled?'rgba(229,147,19,0.10)':'none'}
        stroke="#E59313" strokeWidth="1.2" strokeOpacity={filled?0.4:0.25}/>
    </svg>
  );
};

const Stars = ({ n = 5 }) => (
  <div className="flex gap-0.5">
    {Array.from({length:n}).map((_,i)=><Star key={i} className="w-3.5 h-3.5 fill-[#E59313] text-[#E59313]"/>)}
  </div>
);
const Tag = ({ children }) => (
  <span className="inline-block text-[10px] font-bold tracking-[0.28em] uppercase text-[#E59313] mb-3">{children}</span>
);
const Rule = () => <div className="w-8 h-[2px] rounded-full bg-[#E59313] mb-5" />;

const IMG = {
  hero:         'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1800&q=85',
  boardroom:    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  presentation: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
  networking:   'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
  executive:    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=700&q=80',
  womanExec:    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&q=80',
  globalMeet:   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
};

/* ═══════════════════════════════════════════════════════════════
   NAV LINKS (shared between header + mobile drawer)
   ═══════════════════════════════════════════════════════════════ */
const NAV = [
  { label: 'Método',      href: '#method'       },
  { label: 'Resultados',  href: '#videos'       },
  { label: 'Depoimentos', href: '#testimonials' },
  { label: 'Planos',      href: '#plans'        },
  { label: 'FAQ',         href: '#faq'          },
];

function scrollTo(href) {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════════════════════════════════════════════════════════════
   DIAGNOSTIC FORM MODAL
   ═══════════════════════════════════════════════════════════════ */
const NIVEL_OPTIONS = [
  { value: 'iniciante',      label: 'Iniciante'                           },
  { value: 'intermediario',  label: 'Intermediário'                       },
  { value: 'avancado',       label: 'Avançado'                            },
  { value: 'fluente_inseg',  label: 'Fluente, mas inseguro ao falar'      },
  { value: 'nao_sei',        label: 'Não sei meu nível de inglês'         },
];

const PERIODO_OPTIONS = [
  { value: 'manha',    label: 'Manhã (08h – 12h)'    },
  { value: 'tarde',    label: 'Tarde (12h – 18h)'    },
  { value: 'noite',    label: 'Noite (18h – 21h)'    },
  { value: 'qualquer', label: 'Qualquer horário'      },
];

async function postOkktoLead(payload) {
  try {
    await fetch('/api/marketing/okkto-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Falha ao enviar lead para Okkto:', error);
  }
}

const PLANO_OPTIONS = [
  { value: '357',   label: 'R$357/mês — Bronze (1×/semana)'  },
  { value: '697',   label: 'R$697/mês — Silver (2×/semana)'  },
  { value: '997',   label: 'R$997/mês — Gold (3×/semana)'    },
  { value: '1367',  label: 'R$1.367/mês — Diamond (4×/semana)'},
  { value: '1697',  label: 'R$1.697/mês — VIP (5×/semana)'   },
  { value: 'outro', label: 'Não consigo investir esses valores'},
];

function DiagnosticModal({ open, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '', email: '', whatsapp: '', ocupacao: '',
    nivel: '', periodo: '', plano: '', outrovalor: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const leadPayload = {
      name: form.nome,
      email: form.email,
      whatsapp: form.whatsapp,
      ocupacao: form.ocupacao,
      nivel: NIVEL_OPTIONS.find(o=>o.value===form.nivel)?.label || form.nivel,
      periodo: PERIODO_OPTIONS.find(o=>o.value===form.periodo)?.label || form.periodo,
      plano: PLANO_OPTIONS.find(o=>o.value===form.plano)?.label || form.plano,
      outrovalor: form.outrovalor || '',
      source: 'diagnostico-site',
    };
    postOkktoLead(leadPayload).catch(() => {});
    setSubmitted(true);
  };

  const inputCls = `w-full rounded-xl border px-4 py-3 text-[14px] text-white placeholder-white/30 bg-white/[0.06] border-white/[0.12] focus:border-[#E59313]/60 focus:bg-white/[0.09] focus:outline-none transition-all duration-200`;
  const labelCls = `block text-[11.5px] font-semibold text-white/50 mb-1.5 tracking-wide uppercase`;
  const radioCls = `flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl"
        style={{ background: '#0e0e11', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{ background: '#0e0e11', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#E59313] mb-0.5">Be Fluent</p>
            <h2 className="text-lg font-black text-white leading-tight"
              style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Agendar Diagnóstico Gratuito
            </h2>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="px-7 py-10 text-center">
            {/* Success icon */}
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-[#E59313]/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-20 h-20 rounded-full bg-[#E59313]/15 border-2 border-[#E59313]/40 flex items-center justify-center">
                <Check className="w-9 h-9 text-[#E59313]" strokeWidth={2.5} />
              </div>
            </div>

            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#E59313] mb-2">Solicitação enviada</p>
            <h3 className="text-2xl font-black text-white mb-3 leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Recebemos seu<br />diagnóstico!
            </h3>
            <p className="text-white/50 text-[13.5px] leading-relaxed mb-8 max-w-sm mx-auto">
              Nossa equipe entrará em contato em breve. Fique de olho no seu WhatsApp!
            </p>

            {/* Acelerar atendimento */}
            <div className="rounded-2xl p-5 mb-6 text-left"
              style={{ background: 'rgba(229,147,19,0.07)', border: '1px solid rgba(229,147,19,0.25)' }}>
              <p className="text-white font-bold text-[13px] mb-1">Quer acelerar seu atendimento?</p>
              <p className="text-white/50 text-[12px] leading-relaxed mb-4">
                Clique abaixo para falar diretamente com nossa equipe no WhatsApp e garantir sua vaga mais rápido.
              </p>
              <a
                href="https://wa.me/5598985332458?text=Ol%C3%A1%2C+acabei+de+preencher+o+formul%C3%A1rio+de+diagn%C3%B3stico+na+Be+Fluent+e+gostaria+de+acelerar+meu+atendimento!"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-[13.5px] font-black text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(37,211,102,0.4)]"
                style={{ background: '#25D366', fontFamily: "'Montserrat', sans-serif" }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Acelerar meu atendimento
              </a>
            </div>

            <button onClick={onClose}
              className="text-white/30 text-[12px] hover:text-white/60 transition-all underline underline-offset-2">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-7 pb-7 pt-5 space-y-5">

            {/* Session info banner */}
            <div className="rounded-2xl p-4 flex gap-3"
              style={{ background: 'rgba(229,147,19,0.07)', border: '1px solid rgba(229,147,19,0.2)' }}>
              <div className="w-9 h-9 rounded-xl bg-[#E59313]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-[#E59313]" />
              </div>
              <div>
                <p className="text-white font-semibold text-[13px] mb-0.5">Reunião Estratégica — 30 minutos</p>
                <p className="text-white/50 text-[12.5px] leading-relaxed">
                  Uma reunião gratuita e sem compromisso com um dos nossos consultores para entender suas prioridades
                  e expectativas com o inglês.
                </p>
              </div>
            </div>

            {/* 1 — Nome */}
            <div>
              <label className={labelCls}>1. Nome completo</label>
              <input type="text" required placeholder="Seu nome completo"
                className={inputCls} value={form.nome} onChange={e=>set('nome',e.target.value)} />
            </div>

            {/* 2 — Email */}
            <div>
              <label className={labelCls}>2. E-mail</label>
              <input type="email" required placeholder="seu@email.com"
                className={inputCls} value={form.email} onChange={e=>set('email',e.target.value)} />
            </div>

            {/* 3 — WhatsApp */}
            <div>
              <label className={labelCls}>3. WhatsApp</label>
              <input type="tel" required placeholder="(99) 99999-9999"
                className={inputCls} value={form.whatsapp} onChange={e=>set('whatsapp',e.target.value)} />
            </div>

            {/* 4 — Ocupação */}
            <div>
              <label className={labelCls}>4. Ocupação atual</label>
              <input type="text" required placeholder="Ex: Gerente de Projetos, Empresário..."
                className={inputCls} value={form.ocupacao} onChange={e=>set('ocupacao',e.target.value)} />
            </div>

            {/* 5 — Nível */}
            <div>
              <label className={labelCls}>5. Qual é o seu nível de inglês?</label>
              <div className="space-y-2">
                {NIVEL_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`${radioCls} ${form.nivel===opt.value
                      ? 'border-[#E59313]/60 bg-[#E59313]/08 text-white'
                      : 'border-white/[0.09] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/80'
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${form.nivel===opt.value ? 'border-[#E59313]' : 'border-white/30'}`}>
                      {form.nivel===opt.value && <div className="w-2 h-2 rounded-full bg-[#E59313]" />}
                    </div>
                    <span className="text-[13.5px] font-medium">{opt.label}</span>
                    <input type="radio" name="nivel" value={opt.value} className="sr-only"
                      onChange={()=>set('nivel',opt.value)} />
                  </label>
                ))}
              </div>
              {form.nivel === 'nao_sei' && (
                <div className="mt-3 rounded-xl p-4"
                  style={{ background: 'rgba(229,147,19,0.07)', border: '1px solid rgba(229,147,19,0.2)' }}>
                  <p className="text-white/70 text-[12.5px] leading-relaxed">
                    <span className="text-[#E59313] font-semibold">Teste de Nivelamento:</span>{' '}
                    Após agendar sua reunião, você poderá realizar nosso teste de nivelamento gratuito
                    para identificar exatamente onde você está e onde quer chegar.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/nivelamento');
                    }}
                    className="mt-4 inline-flex rounded-full bg-white/[0.08] border border-white/[0.14] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.12] transition-all duration-200"
                  >
                    Fazer o teste agora
                  </button>
                </div>
              )}
            </div>

            {/* 6 — Período */}
            <div>
              <label className={labelCls}>6. Melhor período para a sua reunião</label>
              <div className="grid grid-cols-2 gap-2">
                {PERIODO_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`${radioCls} ${form.periodo===opt.value
                      ? 'border-[#E59313]/60 bg-[#E59313]/08 text-white'
                      : 'border-white/[0.09] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/80'
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${form.periodo===opt.value ? 'border-[#E59313]' : 'border-white/30'}`}>
                      {form.periodo===opt.value && <div className="w-2 h-2 rounded-full bg-[#E59313]" />}
                    </div>
                    <span className="text-[12.5px] font-medium leading-tight">{opt.label}</span>
                    <input type="radio" name="periodo" value={opt.value} className="sr-only"
                      onChange={()=>set('periodo',opt.value)} />
                  </label>
                ))}
              </div>
            </div>

            {/* 7 — Plano / investimento */}
            <div>
              <label className={labelCls}>7. Quanto você está disposto a investir mensalmente?</label>
              <p className="text-white/35 text-[11.5px] mb-3 leading-relaxed">
                Todos os planos incluem aulas ao vivo 1-a-1, suporte, material e relatório de progresso.
                A diferença está apenas na frequência e no prazo de conclusão.
              </p>
              <div className="space-y-2">
                {PLANO_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`${radioCls} ${form.plano===opt.value
                      ? 'border-[#E59313]/60 bg-[#E59313]/08 text-white'
                      : 'border-white/[0.09] bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/80'
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${form.plano===opt.value ? 'border-[#E59313]' : 'border-white/30'}`}>
                      {form.plano===opt.value && <div className="w-2 h-2 rounded-full bg-[#E59313]" />}
                    </div>
                    <span className="text-[13px] font-medium">{opt.label}</span>
                    <input type="radio" name="plano" value={opt.value} className="sr-only"
                      onChange={()=>set('plano',opt.value)} />
                  </label>
                ))}
              </div>
              {form.plano === 'outro' && (
                <div className="mt-3">
                  <input type="text" placeholder="Digite aqui quanto você consegue investir hoje"
                    className={inputCls} value={form.outrovalor}
                    onChange={e=>set('outrovalor',e.target.value)} />
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit"
              className="w-full rounded-full bg-[#E59313] text-white font-black py-4 text-[15px] transition-all duration-250 hover:bg-[#f0a020] hover:shadow-[0_0_48px_rgba(229,147,19,0.45)] hover:scale-[1.01] active:scale-[0.99] mt-2"
              style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Agendar minha Reunião Gratuita
              <ArrowRight className="inline-block ml-2 w-4 h-4" />
            </button>
            <p className="text-center text-white/25 text-[11px] pb-1">
              Gratuito · Sem compromisso · Respondemos em até 24h
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq]         = useState(null);
  const [emblaRef, emblaApi]          = useEmblaCarousel({ loop: true });
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [diagOpen, setDiagOpen]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const videoRefs                     = useRef([]);

  const { data: siteSettings = {} } = useQuery({
    queryKey: ['/api/site-settings'],
    queryFn: async () => {
      const res = await fetch('/api/site-settings');
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const heroTitle     = siteSettings?.hero_title?.value    || 'Inglês para\nprofissionais\nambiciosos.';
  const heroSubtitle  = siteSettings?.hero_subtitle?.value || 'Comunicação estratégica em inglês para reuniões, negociações e oportunidades internacionais.';
  const statsStudents     = siteSettings?.stats_students?.value     || '500+';
  const statsExperience   = siteSettings?.stats_experience?.value   || '10+';
  const statsSatisfaction = siteSettings?.stats_satisfaction?.value || '98%';
  const announcementBar     = siteSettings?.announcement_bar?.value   || '';
  const announcementEnabled = siteSettings?.announcement_bar_enabled?.value === 'true';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const pauseAllVideos = useCallback(() => {
    videoRefs.current.forEach(v => { if (v) { v.pause(); } });
  }, []);

  const scrollPrev = useCallback(() => { pauseAllVideos(); emblaApi?.scrollPrev(); }, [emblaApi, pauseAllVideos]);
  const scrollNext = useCallback(() => { pauseAllVideos(); emblaApi?.scrollNext(); }, [emblaApi, pauseAllVideos]);
  const onSelect   = useCallback(() => {
    if (!emblaApi) return;
    pauseAllVideos();
    setSelectedVideo(emblaApi.selectedScrollSnap());
  }, [emblaApi, pauseAllVideos]);
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi, onSelect]);

  /* ── Data ── */
  const conquistas = [
    { icon: MessageCircle, text: 'Conduzir reuniões em inglês com autoridade' },
    { icon: Target,        text: 'Apresentar projetos com precisão e impacto' },
    { icon: Award,         text: 'Ser ouvido e respeitado internacionalmente' },
    { icon: Briefcase,     text: 'Negociar contratos com naturalidade'         },
    { icon: TrendingUp,    text: 'Conquistar promoções e novas posições'       },
    { icon: Plane,         text: 'Viajar e representar sua empresa sem medo'   },
    { icon: Users,         text: 'Ampliar networking e parcerias globais'      },
    { icon: Globe,         text: 'Comunicar-se com o mundo sem barreiras'      },
  ];

  const metodoPilares = [
    { num: '01', title: 'Relevância Profissional',     desc: 'Vocabulário, expressões e simulações totalmente adaptadas à sua área de atuação.' },
    { num: '02', title: 'Performance em Tempo Real',   desc: 'Conversação estratégica desde a primeira aula, focando no desbloqueio emocional.' },
    { num: '03', title: 'Medição de Progresso',        desc: 'Avaliação contínua de fluidez, vocabulário, clareza e confiança — resultados visíveis.' },
  ];

  const passos = [
    { num: '1', title: 'Agende seu Diagnóstico',      desc: 'Sessão gratuita para entender seus bloqueios e objetivos de carreira.' },
    { num: '2', title: 'Receba seu Plano Estratégico', desc: 'Aulas personalizadas direcionadas ao que sua carreira exige.' },
    { num: '3', title: 'Performe em Inglês',           desc: 'Treino contínuo, métricas reais e comunidade = crescimento consistente.' },
  ];

  const publicoAlvo = [
    { title: 'Executivos e Gestores',      desc: 'Que precisam liderar reuniões e negociações internacionais com confiança.' },
    { title: 'Empreendedores',             desc: 'Que querem expandir negócios e fechar parcerias no exterior.' },
    { title: 'Profissionais em Transição', desc: 'Que buscam oportunidades em multinacionais ou no mercado internacional.' },
    { title: 'Técnicos e Especialistas',   desc: 'Que precisam apresentar projetos e colaborar com equipes globais.' },
    { title: 'Jovens Universitários',      desc: 'Terminando a faculdade e querendo entrar no mercado com inglês sólido.' },
  ];

  const testimonials = [
    { name: 'Amanda Martins',   role: 'Diretora Executiva', text: 'As aulas transformaram a forma como me comunico em reuniões internacionais. Hoje lidero com muito mais confiança e clareza.' },
    { name: 'Alessandra Alves', role: 'Empresária',         text: 'Confio 100% no método. A evolução é visível semana a semana. Fechar meu primeiro contrato em inglês foi um marco.' },
  ];

  const videoTestimonials = [
    { src: videoDepoimento1, name: 'Lanna Lírio',       role: 'Empresária' },
    { src: videoDepoimento2, name: 'Gutemberg Estrela',  role: 'Executivo'  },
    { src: videoDepoimento3, name: 'Ariane Ribeiro',     role: 'Empresária' },
  ];

  const faqItems = [
    { q: 'Em quanto tempo verei resultados?',  a: 'Em meses, não anos. Seu progresso é medido a cada aula com métricas reais de evolução.' },
    { q: 'É só conversação?',                  a: 'Não. É comunicação estratégica voltada ao seu trabalho, com foco em performance real e desbloqueio profissional.' },
    { q: 'Preciso ter nível mínimo?',           a: 'Não. Temos planos para iniciantes, intermediários e avançados — o método se adapta ao seu ponto de partida.' },
    { q: 'As aulas são individuais?',           a: 'Sim, 100% ao vivo via Google Meet, totalmente personalizadas para você e sua realidade profissional.' },
    { q: 'Posso cancelar quando quiser?',       a: 'Sim. Sem fidelidade, sem burocracia.' },
    { q: 'O Diagnóstico é gratuito?',           a: 'Sim, completamente gratuito e sem compromisso.' },
  ];

  const plans = [
    { name: 'Bronze',  freq: '1×/semana', lessons: '4',  price: '357',   features: ['1 aula/semana','Suporte via WhatsApp','Material didático incluso','Professor especialista','Relatório de progresso'] },
    { name: 'Silver',  freq: '2×/semana', lessons: '8',  price: '697',   features: ['2 aulas/semana','Suporte via WhatsApp','Material didático incluso','Professor especialista','Relatório de progresso'] },
    { name: 'Gold',    freq: '3×/semana', lessons: '12', price: '997',   featured: true, features: ['3 aulas/semana','Suporte prioritário','Material didático incluso','Professor especialista','Relatório de progresso'] },
    { name: 'Diamond', freq: '4×/semana', lessons: '16', price: '1.367', features: ['4 aulas/semana','Suporte VIP','Material incluso','Professor especialista','Relatório de progresso'] },
    { name: 'VIP',     freq: '5×/semana', lessons: '20', price: '1.697', features: ['5 aulas/semana','Atendimento exclusivo','Material premium','Professor especialista','Relatório de progresso'] },
  ];

  /* CTA — open modal */
  const openDiag = () => setDiagOpen(true);

  /* Nav scrolled style */
  const navBg = scrolled
    ? 'bg-black/80 backdrop-blur-md border-b border-white/[0.07] shadow-[0_2px_20px_rgba(0,0,0,0.6)]'
    : 'bg-transparent border-b border-transparent';

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#050506' }}>

      {/* ── Diagnostic modal ── */}
      <DiagnosticModal open={diagOpen} onClose={() => setDiagOpen(false)} />

      {/* ── Announcement bar ── */}
      {announcementEnabled && announcementBar && !announcementDismissed && (
        <div style={{ background: '#E59313' }}
          className="relative z-[60] text-white text-center py-2.5 px-4 text-[13px] font-semibold flex items-center justify-center">
          <span>{announcementBar}</span>
          <button onClick={() => setAnnouncementDismissed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          HERO — full-viewport, header merged inside (Wiseup style)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">

        {/* ── Full-bleed dark background image ── */}
        <div className="absolute inset-0">
          <img src={IMG.hero} alt="" className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.28) saturate(0.4)' }} />
          {/* gradient overlays for depth */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(5,5,6,0.92) 0%, rgba(5,5,6,0.55) 55%, rgba(5,5,6,0.15) 100%)' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(5,5,6,0.5) 0%, transparent 30%, transparent 60%, rgba(5,5,6,0.9) 100%)' }} />
          <HoneycombBg opacity={0.035} id="hex-hero" />
          {/* subtle orange glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(229,147,19,0.08) 0%, transparent 60%)' }} />
        </div>

        {/* ── NAVBAR (fixed inside hero visually, transparent → frosted on scroll) ── */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex items-center justify-between h-[60px] sm:h-[66px]">

              {/* Logo */}
              <button onClick={() => scrollTo('#top')} aria-label="Início"
                className="flex items-center gap-2 group shrink-0 min-w-0">
                <img src={beFluentLogo} alt="Be Fluent School Logo"
                  className="h-8 sm:h-10 w-auto object-contain shrink-0 transition-transform duration-300 group-hover:scale-105" />
                <div className="leading-tight hidden xs:block">
                  <span className="block text-white font-black text-[13px] sm:text-[15px] tracking-tight"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}>Be Fluent</span>
                  <span className="block text-[#E59313] text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] uppercase -mt-0.5">
                    Performance English
                  </span>
                </div>
              </button>

              {/* Desktop nav links */}
              <div className="hidden lg:flex items-center gap-0.5">
                {NAV.map(link => (
                  <button key={link.href} onClick={() => scrollTo(link.href)}
                    className="px-4 py-2 rounded-lg text-[13.5px] font-medium text-white/60 hover:text-white hover:bg-white/[0.07] transition-all duration-200">
                    {link.label}
                  </button>
                ))}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <button onClick={() => navigate('/dashboard')}
                    className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-white text-[13px] font-semibold px-4 py-2 transition-all">
                    Acessar Plataforma
                  </button>
                ) : (
                  <button onClick={() => navigate('/auth')}
                    className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.2] text-white text-[13px] font-semibold px-4 py-2 transition-all"
                    data-testid="button-login">
                    Entrar
                  </button>
                )}
                <button onClick={openDiag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#E59313] hover:bg-[#f0a020] text-white text-[12px] sm:text-[13px] font-black px-3.5 sm:px-5 py-2 sm:py-2.5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(229,147,19,0.5)] whitespace-nowrap"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <span className="hidden sm:inline">Agendar Diagnóstico</span>
                  <span className="sm:hidden">Agendar</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                </button>
                {/* Hamburger */}
                <button onClick={() => setMobileMenuOpen(v => !v)}
                  className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label="Menu">
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>

            </div>
          </div>

          {/* Mobile drawer */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}
            style={{ background: 'rgba(8,8,10,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-1">
              {NAV.map(link => (
                <button key={link.href} onClick={() => { scrollTo(link.href); setMobileMenuOpen(false); }}
                  className="text-left px-4 py-3 rounded-xl text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-all">
                  {link.label}
                </button>
              ))}
              {!isAuthenticated && (
                <button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                  className="text-left px-4 py-3 rounded-xl text-[14px] font-medium text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
                  Entrar na plataforma
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* ── HERO CONTENT (left copy + right form) ── */}
        <div className="relative flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-16 md:pt-32 md:pb-20">
            <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-10 xl:gap-16 items-center min-h-[75vh]">

              {/* LEFT — headline */}
              <div className="space-y-6">

                {/* Brand badge */}
                <div className="inline-flex items-center gap-2.5">
                  <div className="h-px w-8 bg-[#E59313]" />
                  <span className="text-[11px] font-bold tracking-[0.28em] uppercase text-[#E59313]">
                    Curso de Inglês para Profissionais
                  </span>
                </div>

                <h1 className="text-[2.8rem] sm:text-[3.6rem] lg:text-[4.2rem] xl:text-[4.8rem] font-black leading-[1.0] tracking-[-0.04em] text-white whitespace-pre-line"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {heroTitle}
                </h1>

                <p className="text-[17px] text-white/55 leading-relaxed max-w-[480px]">
                  {heroSubtitle}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { v: statsStudents,     l: 'alunos formados'     },
                    { v: statsExperience,   l: 'anos de experiência' },
                    { v: statsSatisfaction, l: 'de satisfação'       },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl border p-4 text-center"
                      style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                      <p className="text-2xl font-black text-white leading-none"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}>{s.v}</p>
                      <p className="text-[11px] text-white/45 mt-1.5 leading-snug">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* Mobile CTA */}
                <button onClick={openDiag}
                  className="lg:hidden group inline-flex items-center gap-2.5 rounded-full bg-[#E59313] px-8 py-4 text-[15px] font-black text-white transition-all hover:bg-[#f0a020] hover:shadow-[0_0_48px_rgba(229,147,19,0.5)]"
                  style={{ fontFamily: "'Montserrat', sans-serif" }} data-testid="button-hero-cta-mobile">
                  Agendar Diagnóstico Grátis
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* RIGHT — full inline diagnostic form (Wiseup style) */}
              <div className="hidden lg:block">
                <HeroFullForm />
              </div>

            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #050506)' }} />
      </section>

      <NivelamentoCTASection />


      {/* ══════════════════════════════════════════════════════════
          SOCIAL PROOF BAND
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: '#0a0a0c', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
          <div className="grid sm:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {[
              { stat: '500+', label: 'Profissionais formados',  sub: 'executivos, empreendedores e especialistas' },
              { stat: '98%',  label: 'Taxa de satisfação',      sub: 'alunos que recomendam o método'            },
              { stat: '10+',  label: 'Anos de metodologia',     sub: 'consolidada para alto impacto'             },
            ].map((item, i) => (
              <div key={i} className="px-8 py-7" style={{ background: '#0a0a0c' }}>
                <p className="text-3xl font-black text-[#E59313] mb-1"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>{item.stat}</p>
                <p className="text-[13.5px] font-semibold text-white/80 mb-0.5">{item.label}</p>
                <p className="text-[12px] text-white/35">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          IMAGE STRIP
      ══════════════════════════════════════════════════════════ */}
      <section className="overflow-hidden" style={{ background: '#050506' }}>
        <div className="flex h-48 md:h-64">
          {[IMG.boardroom, IMG.presentation, IMG.networking, IMG.globalMeet].map((src, i) => (
            <div key={i} className="flex-1 relative overflow-hidden">
              <img src={src} alt="" loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                style={{ filter: 'brightness(0.45) saturate(0.6)' }} />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(5,5,6,0.6) 0%, transparent 55%)' }} />
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PROBLEM
      ══════════════════════════════════════════════════════════ */}
      <section id="results" className="relative py-28 md:py-36 overflow-hidden" style={{ background: '#0b0b0d' }}>
        <HoneycombBg opacity={0.04} id="hex-problem" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 65% 70% at 50% 50%, rgba(229,147,19,0.07) 0%, transparent 60%)' }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <Tag>A verdade que ninguém te conta</Tag>
          <h2 className="text-4xl md:text-6xl lg:text-[5rem] font-black text-white leading-[1.0] mt-2"
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.04em' }}>
            Seu inglês não trava<br />por falta de estudo.
          </h2>
          <div className="flex items-center justify-center gap-3 my-9">
            <div className="h-px w-20" style={{ background: 'rgba(229,147,19,0.25)' }} />
            <HexCell size={28} filled />
            <div className="h-px w-20" style={{ background: 'rgba(229,147,19,0.25)' }} />
          </div>
          <p className="text-xl md:text-2xl text-white/60 leading-relaxed">
            Você trava porque te ensinaram inglês como <em>matéria escolar</em>,{' '}
            <span className="text-white font-bold not-italic">não como ferramenta de carreira.</span>
          </p>
          <p className="text-base text-white/35 mt-7 max-w-2xl mx-auto italic leading-relaxed">
            "A fluência real se mede pela capacidade de performar em qualquer contexto: numa entrevista,
            numa reunião, num palco — ou numa conversa que vale uma oportunidade."
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CONQUISTAS
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#050506' }}>
        <HoneycombBg opacity={0.03} id="hex-conquistas" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <Tag>O que você conquista</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white leading-tight"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>
              Performance English na prática
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {conquistas.map((item, i) => (
              <div key={i}
                className="group flex items-start gap-3.5 rounded-2xl border p-5 transition-all duration-300 hover:border-[#E59313]/35 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 group-hover:bg-[#E59313]"
                  style={{ background: 'rgba(229,147,19,0.1)', border: '1px solid rgba(229,147,19,0.2)' }}>
                  <item.icon className="w-4 h-4 text-[#E59313] transition-colors duration-300 group-hover:text-white" />
                </div>
                <p className="text-[13.5px] text-white/70 font-medium leading-snug group-hover:text-white/90 transition-colors">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border p-8 text-center"
            style={{ background: 'rgba(229,147,19,0.05)', borderColor: 'rgba(229,147,19,0.18)' }}>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed">
              Você não quer "aprender inglês".
              <strong className="text-[#E59313]"> Você quer crescer na carreira. </strong>
              <span className="text-white/45">O inglês é a ferramenta.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          WHY BE FLUENT
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#0b0b0d' }}>
        <HoneycombBg opacity={0.03} id="hex-why" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="mb-14">
            <Tag>Por que escolher a Be Fluent</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white leading-tight max-w-xl"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>
              Um sistema construído para resultado real
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { tag: 'Metodologia',     title: 'Foco em resultado profissional',      desc: 'Não ensinamos só gramática. Construímos performance para reuniões, negociações e apresentações internacionais.', img: IMG.boardroom    },
              { tag: 'Ritmo',           title: 'Prática desde o primeiro dia',        desc: 'Cada encontro é estruturado para você usar o inglês já na próxima oportunidade profissional real.',             img: IMG.presentation },
              { tag: 'Acompanhamento',  title: 'Suporte próximo e personalizado',     desc: 'Mentoria contínua com orientação prática e acompanhamento detalhado do seu progresso.',                          img: IMG.networking   },
            ].map((card, i) => (
              <div key={i}
                className="group rounded-3xl overflow-hidden border transition-all duration-400 hover:border-[#E59313]/30 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
                <div className="h-36 overflow-hidden">
                  <img src={card.img} alt={card.title} loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ filter: 'brightness(0.45) saturate(0.6)' }} />
                </div>
                <div className="p-7">
                  <Tag>{card.tag}</Tag>
                  <h3 className="text-[15px] font-black text-white mb-2.5 leading-snug"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}>{card.title}</h3>
                  <p className="text-white/45 text-[13.5px] leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TARGET AUDIENCE
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#050506' }}>
        <HoneycombBg opacity={0.03} id="hex-publico" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1fr_380px] gap-14 items-start">
            <div>
              <Tag>Para quem é</Tag>
              <Rule />
              <h2 className="text-3xl md:text-[2.8rem] font-black text-white mb-3 leading-tight"
                style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>
                Be Fluent é para profissionais ambiciosos
              </h2>
              <p className="text-white/45 mb-9 text-base">Que não querem esperar anos para falar inglês com confiança.</p>
              <div className="space-y-3">
                {publicoAlvo.map((item, i) => (
                  <div key={i}
                    className="group flex items-start gap-4 rounded-2xl border p-5 transition-all duration-300 hover:border-[#E59313]/30"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="w-7 h-7 rounded-full bg-[#E59313] flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-bold text-white mb-0.5"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}>{item.title}</h3>
                      <p className="text-white/45 text-[13px] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden lg:block mt-4">
              <div className="rounded-3xl overflow-hidden h-[340px]"
                style={{ border: '1px solid rgba(229,147,19,0.18)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
                <img src={IMG.executive} alt="" loading="lazy" className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.55) saturate(0.75)' }} />
                <div className="absolute inset-0 rounded-3xl"
                  style={{ background: 'linear-gradient(to top, rgba(5,5,6,0.85) 0%, transparent 55%)' }} />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white font-black text-[15px] leading-snug"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    "Inglês como ferramenta<br />de poder profissional."
                  </p>
                  <p className="text-[#E59313] text-[10px] mt-2 font-bold tracking-[0.18em] uppercase">Manifesto Be Fluent</p>
                </div>
              </div>
              <div className="absolute -bottom-5 -right-5 rounded-2xl overflow-hidden w-40 h-40"
                style={{ border: '2px solid rgba(229,147,19,0.25)', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
                <img src={IMG.womanExec} alt="" loading="lazy" className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.6) saturate(0.75)' }} />
              </div>
              <HexCell size={44} filled className="absolute -top-5 -left-3 opacity-40" />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          METHOD
      ══════════════════════════════════════════════════════════ */}
      <section id="method" className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#0b0b0d' }}>
        <HoneycombBg opacity={0.04} id="hex-method" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <Tag>Método</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>
              O método Be Fluent
            </h2>
            <p className="text-white/45 mt-3 text-base max-w-lg mx-auto">
              3 pilares que transformam seu inglês de matéria a instrumento de carreira
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {metodoPilares.map(item => (
              <div key={item.num}
                className="group rounded-3xl border p-8 text-center transition-all duration-350 hover:border-[#E59313]/35 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)', transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
                <div className="relative w-14 h-14 mx-auto mb-5 flex items-center justify-center">
                  <HexCell size={56} filled className="absolute inset-0 w-full h-full" />
                  <span className="relative text-xl font-black text-[#E59313] z-10"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}>{item.num}</span>
                </div>
                <h3 className="text-[15px] font-black text-white mb-2.5"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>{item.title}</h3>
                <p className="text-white/45 text-[13px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ABOUT — Isabella
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#080809' }}>
        <HoneycombBg opacity={0.035} id="hex-about" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 10% 50%, rgba(229,147,19,0.06) 0%, transparent 55%)' }} />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid md:grid-cols-[300px_1fr] gap-12 items-center">
            <div className="relative mx-auto md:mx-0 w-full max-w-[300px]">
              <div className="absolute inset-0 rounded-3xl blur-2xl opacity-15"
                style={{ background: 'radial-gradient(circle, #E59313 0%, transparent 70%)' }} />
              <img src={isabellaFounder} alt="Isabella Estrela"
                className="relative rounded-3xl w-full aspect-[3/4] object-cover object-top border"
                style={{ borderColor: 'rgba(229,147,19,0.18)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }} />
              <HexCell size={44} filled className="absolute -bottom-3 -right-3 opacity-50" />
            </div>
            <div>
              <Tag>Fundadora</Tag>
              <Rule />
              <h2 className="text-3xl md:text-[2.5rem] font-black text-white mb-1"
                style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>Isabella Estrela</h2>
              <p className="text-[#E59313] font-bold text-[14px] mb-5">Criadora do Método Be Fluent</p>
              <p className="text-white/55 leading-relaxed mb-4 text-[15px]">
                Especialista em inglês para executivos com mais de 10 anos de experiência.
                Formada em metodologias de ensino focadas em comunicação corporativa de alto impacto.
              </p>
              <blockquote className="relative pl-5 mb-7" style={{ borderLeft: '2px solid #E59313' }}>
                <p className="text-white/65 leading-relaxed italic text-[14.5px]">
                  "Meu objetivo é ajudar profissionais a se comunicarem com clareza e confiança,
                  para que mostrem todo o seu potencial em contextos internacionais."
                </p>
              </blockquote>
              <div className="flex flex-wrap gap-2.5">
                {['Personalização', 'Evolução medida', 'Foco em carreira'].map(t => (
                  <span key={t} className="text-[11px] font-bold px-3.5 py-1.5 rounded-full border text-[#E59313]"
                    style={{ background: 'rgba(229,147,19,0.07)', borderColor: 'rgba(229,147,19,0.3)' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW TO START
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#050506' }}>
        <HoneycombBg opacity={0.035} id="hex-steps" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(229,147,19,0.07) 0%, transparent 60%)' }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <Tag>Como começar</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>O caminho é simples</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-14 relative">
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px"
              style={{ background: 'linear-gradient(to right, rgba(229,147,19,0.3), rgba(229,147,19,0.3))' }} />
            {passos.map(passo => (
              <div key={passo.num} className="text-center relative z-10">
                <div className="relative w-14 h-14 mx-auto mb-6 flex items-center justify-center">
                  <HexCell size={56} filled className="absolute inset-0 w-full h-full" />
                  <span className="relative text-xl font-black text-[#E59313] z-10"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}>{passo.num}</span>
                </div>
                <h3 className="text-[14.5px] font-black text-white mb-2.5"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>{passo.title}</h3>
                <p className="text-white/45 text-[13px] leading-relaxed">{passo.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={openDiag} data-testid="button-passos-cta"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#E59313] px-9 py-4 text-[15px] font-black text-white transition-all duration-250 hover:bg-[#f0a020] hover:shadow-[0_0_48px_rgba(229,147,19,0.45)] hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Agendar Diagnóstico de Performance
              <ArrowRight className="w-4 h-4 transition-transform duration-250 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TEXT TESTIMONIALS
      ══════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#0b0b0d' }}>
        <HoneycombBg opacity={0.03} id="hex-test" />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <Tag>Depoimentos</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>
              O que nossos alunos dizem
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {testimonials.map((t, i) => (
              <div key={i}
                className="group rounded-3xl border p-8 transition-all duration-350 hover:border-[#E59313]/30 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)', transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
                <Stars />
                <p className="text-[#E59313] text-[3.5rem] font-black leading-none mt-3 mb-1 opacity-40"
                  style={{ fontFamily: 'Georgia, serif' }}>"</p>
                <p className="text-white/70 text-[14.5px] leading-relaxed mb-7 -mt-2 italic">{t.text}"</p>
                <div className="flex items-center gap-3.5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="w-11 h-11 rounded-full bg-[#E59313] flex items-center justify-center shrink-0 shadow-md">
                    <span className="text-white font-black text-base">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-[13.5px]">{t.name}</p>
                    <p className="text-[#E59313] text-[11px] font-semibold mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          VIDEO TESTIMONIALS
      ══════════════════════════════════════════════════════════ */}
      <section id="videos" className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#080809' }}>
        <HoneycombBg opacity={0.045} id="hex-videos" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 65% at 50% 50%, rgba(229,147,19,0.06) 0%, transparent 58%)' }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <Tag>Histórias reais</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white mb-3"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>
              Histórias de transformação
            </h2>
            <p className="text-white/40 text-base">Veja quem já transformou a carreira com o método Be Fluent</p>
          </div>
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <button onClick={scrollPrev} aria-label="Anterior" data-testid="button-video-prev"
              className="w-11 h-11 rounded-full border flex items-center justify-center transition-all hover:border-[#E59313]/50 hover:bg-[#E59313]/10"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="overflow-hidden w-[240px] md:w-[270px]" ref={emblaRef}>
              <div className="flex">
                {videoTestimonials.map((v, i) => (
                  <div key={i} className="flex-[0_0_100%] min-w-0">
                    <div className="rounded-3xl overflow-hidden border"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.09)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                      <video
                        ref={el => { videoRefs.current[i] = el; }}
                        controls className="w-full aspect-[9/16] object-cover" preload="metadata">
                        <source src={v.src} type="video/mp4" />
                      </video>
                      <div className="p-4 text-center">
                        <p className="font-black text-white text-[13.5px]">{v.name}</p>
                        <p className="text-white/40 text-[11px] mt-0.5">{v.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={scrollNext} aria-label="Próximo" data-testid="button-video-next"
              className="w-11 h-11 rounded-full border flex items-center justify-center transition-all hover:border-[#E59313]/50 hover:bg-[#E59313]/10"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex justify-center gap-2 mt-7">
            {videoTestimonials.map((_, i) => (
              <button key={i}
                className={`rounded-full transition-all duration-300 ${selectedVideo === i ? 'w-6 h-2 bg-[#E59313]' : 'w-2 h-2 bg-white/20 hover:bg-white/35'}`}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Vídeo ${i + 1}`}
                data-testid={`button-video-dot-${i}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PLANS
      ══════════════════════════════════════════════════════════ */}
      <section id="plans" className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#050506' }}>
        <HoneycombBg opacity={0.035} id="hex-plans" />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <Tag>Investimento</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white mb-3"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>Escolha seu plano</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">
              Todos os planos incluem os mesmos benefícios. O que muda é apenas a frequência e o prazo de evolução.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-5 lg:grid-cols-3 md:grid-cols-2">
            {plans.map((plan, i) => (
              <div key={i}
                className={`relative flex flex-col rounded-3xl p-6 border transition-all duration-300 hover:scale-[1.02]`}
                style={plan.featured
                  ? { background: 'rgba(229,147,19,0.07)', borderColor: 'rgba(229,147,19,0.5)', boxShadow: '0 0 60px rgba(229,147,19,0.13)' }
                  : { background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.08)' }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E59313] text-white text-[9px] font-black px-3.5 py-1.5 rounded-full tracking-[0.18em] uppercase whitespace-nowrap shadow-[0_4px_20px_rgba(229,147,19,0.4)]">
                    Mais Escolhido
                  </div>
                )}
                <p className={`mt-1.5 mb-0.5 text-[9px] font-black tracking-[0.22em] uppercase ${plan.featured ? 'text-[#E59313]' : 'text-white/25'}`}>{plan.name}</p>
                <p className="text-white/30 text-[11px] mb-4">{plan.freq} · {plan.lessons} aulas/mês</p>
                <div className="mb-6">
                  <span className="text-[2rem] font-black text-white leading-none"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}>R$&nbsp;{plan.price}</span>
                  <span className="text-white/25 text-xs ml-1">/mês</span>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-[12.5px] text-white/55">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-[#E59313] shrink-0" strokeWidth={2.5} />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={openDiag}
                  data-testid={`button-plano-${plan.name.toLowerCase()}`}
                  className={`w-full rounded-full py-2.5 text-[12.5px] font-black transition-all duration-250 hover:scale-[1.02] ${
                    plan.featured
                      ? 'bg-[#E59313] text-white hover:bg-[#f0a020] hover:shadow-[0_0_28px_rgba(229,147,19,0.4)]'
                      : 'border text-white/70 hover:text-white hover:border-[#E59313]/45'
                  }`}
                  style={!plan.featured ? { borderColor: 'rgba(255,255,255,0.14)' } : {}}>
                  Escolher Plano
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════ */}
      <section id="faq" className="relative py-24 md:py-32 overflow-hidden" style={{ background: '#0b0b0d' }}>
        <HoneycombBg opacity={0.03} id="hex-faq" />
        <div className="relative max-w-2xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <Tag>Dúvidas</Tag>
            <Rule />
            <h2 className="text-3xl md:text-[2.8rem] font-black text-white"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}>Perguntas frequentes</h2>
          </div>
          <div className="space-y-2.5">
            {faqItems.map((item, index) => (
              <div key={index}
                className="rounded-2xl border overflow-hidden transition-all duration-300"
                style={openFaq === index
                  ? { background: 'rgba(229,147,19,0.05)', borderColor: 'rgba(229,147,19,0.35)' }
                  : { background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <button className="w-full flex items-center justify-between text-left gap-4"
                  style={{ padding: '1.1rem 1.5rem' }}
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  data-testid={`button-faq-${index}`}>
                  <span className="font-semibold text-white text-[14px] leading-snug">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#E59313] shrink-0 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <p className="px-6 pb-5 text-white/50 text-[13.5px] leading-relaxed">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-32 md:py-44 overflow-hidden" style={{ background: '#080809' }}>
        <HoneycombBg opacity={0.06} id="hex-finalcta" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 75% at 50% 60%, rgba(229,147,19,0.11) 0%, transparent 58%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(229,147,19,0.07)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(229,147,19,0.03)' }} />
        <HexCell size={72} filled className="absolute top-14 left-20 opacity-15 hidden md:block" />
        <HexCell size={48} className="absolute bottom-20 right-24 opacity-20 hidden md:block" />
        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <Tag>Próximo passo</Tag>
          <Rule />
          <h2 className="text-4xl md:text-[3.6rem] lg:text-[4.4rem] font-black text-white mb-5 leading-[1.05]"
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.04em' }}>
            Sua carreira não pode<br />esperar mais um ano.
          </h2>
          <p className="text-lg text-white/45 mb-12 leading-relaxed">Vamos destravar sua comunicação em inglês agora?</p>
          <button onClick={openDiag} data-testid="button-final-cta"
            className="group inline-flex items-center gap-3 rounded-full bg-[#E59313] px-11 py-5 text-[16px] font-black text-white transition-all duration-300 hover:bg-[#f0a020] hover:shadow-[0_0_72px_rgba(229,147,19,0.5)] hover:scale-[1.03] active:scale-[0.98]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Agendar Diagnóstico de Performance
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
          <p className="text-white/20 text-[11px] mt-11 tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Fale com clareza. Performe com potência.
          </p>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   HERO FULL FORM (7 questions, dropdown selects — Wiseup style)
   ═══════════════════════════════════════════════════════════════ */
function HeroFullForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '', email: '', whatsapp: '', ocupacao: '',
    nivel: '', periodo: '', plano: '', outrovalor: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-white placeholder-white/30 bg-white/[0.07] border-white/[0.12] focus:border-[#E59313]/60 focus:bg-white/[0.10] focus:outline-none transition-all duration-200`;
  const selectCls = `w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-white bg-[#0e0e12] border-white/[0.12] focus:border-[#E59313]/60 focus:outline-none transition-all duration-200 appearance-none cursor-pointer`;
  const labelCls = `block text-[10.5px] font-bold text-white/40 mb-1.5 tracking-[0.12em] uppercase`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const leadPayload = {
      name: form.nome,
      email: form.email,
      whatsapp: form.whatsapp,
      ocupacao: form.ocupacao,
      nivel: form.nivel,
      periodo: form.periodo,
      plano: form.plano,
      outrovalor: form.outrovalor,
    };
    postOkktoLead(leadPayload).catch(() => {});

    const msg = [
      `*Diagnóstico Be Fluent*`,
      `Nome: ${form.nome}`,
      `E-mail: ${form.email}`,
      `WhatsApp: ${form.whatsapp}`,
      `Ocupação: ${form.ocupacao}`,
      `Nível: ${NIVEL_OPTIONS.find(o => o.value === form.nivel)?.label || form.nivel}`,
      `Período: ${PERIODO_OPTIONS.find(o => o.value === form.periodo)?.label || form.periodo}`,
      `Plano: ${PLANO_OPTIONS.find(o => o.value === form.plano)?.label || form.plano}`,
      form.plano === 'outro' ? `Valor disponível: ${form.outrovalor}` : '',
    ].filter(Boolean).join('%0A');
    window.open(`https://wa.me/5598985332458?text=${msg}`, '_blank');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-3xl p-8 text-center"
        style={{ background: 'rgba(14,14,18,0.85)', border: '1px solid rgba(229,147,19,0.2)', backdropFilter: 'blur(16px)' }}>
        <div className="w-14 h-14 rounded-full bg-[#E59313]/15 border border-[#E59313]/30 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-[#E59313]" strokeWidth={2.5} />
        </div>
        <h3 className="text-lg font-black text-white mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Recebemos seu contato!
        </h3>
        <p className="text-white/45 text-sm leading-relaxed">
          Nossa equipe entrará em contato para confirmar sua reunião. Fique de olho no WhatsApp!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden"
      style={{ background: 'rgba(10,10,14,0.88)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)', boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>

      {/* Card header */}
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[9.5px] font-black tracking-[0.28em] uppercase text-[#E59313] mb-1">Be Fluent</p>
        <h3 className="text-[15px] font-black text-white leading-snug" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Agende seu Diagnóstico Gratuito
        </h3>
        <p className="text-white/35 text-[11.5px] mt-1">Reunião de 30 minutos · gratuita · sem compromisso</p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3.5">
        {/* Row 1 — Nome + Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nome</label>
            <input type="text" required placeholder="Seu nome" className={inputCls}
              value={form.nome} onChange={e => set('nome', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input type="email" required placeholder="seu@email.com" className={inputCls}
              value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
        </div>

        {/* Row 2 — WhatsApp + Ocupação */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>WhatsApp</label>
            <input type="tel" required placeholder="(99) 99999-9999" className={inputCls}
              value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Ocupação</label>
            <input type="text" required placeholder="Ex: Gestor, CEO..." className={inputCls}
              value={form.ocupacao} onChange={e => set('ocupacao', e.target.value)} />
          </div>
        </div>

        {/* Nível */}
        <div className="relative">
          <label className={labelCls}>Nível de inglês atual</label>
          <div className="relative">
            <select required className={selectCls} value={form.nivel} onChange={e => set('nivel', e.target.value)}>
              <option value="" disabled style={{ color: 'rgba(255,255,255,0.3)' }}>Selecione seu nível</option>
              {NIVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
          {form.nivel === 'nao_sei' && (
            <div className="mt-2 rounded-xl px-3 py-3"
              style={{ color: 'rgba(229,147,19,0.9)', background: 'rgba(229,147,19,0.07)', border: '1px solid rgba(229,147,19,0.18)' }}>
              <p className="text-[11.5px] leading-relaxed">
                Após agendar, você poderá fazer nosso teste de nivelamento gratuito.
              </p>
              <button
                type="button"
                onClick={() => navigate('/nivelamento')}
                className="mt-3 inline-flex rounded-full bg-white/[0.08] border border-white/[0.14] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.12] transition-all duration-200"
              >
                Ir para o teste de nivelamento
              </button>
            </div>
          )}
        </div>

        {/* Período */}
        <div className="relative">
          <label className={labelCls}>Melhor horário para a reunião</label>
          <div className="relative">
            <select required className={selectCls} value={form.periodo} onChange={e => set('periodo', e.target.value)}>
              <option value="" disabled>Selecione o período</option>
              {PERIODO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Investimento */}
        <div className="relative">
          <label className={labelCls}>Quanto pode investir mensalmente?</label>
          <div className="relative">
            <select required className={selectCls} value={form.plano} onChange={e => set('plano', e.target.value)}>
              <option value="" disabled>Selecione uma faixa</option>
              {PLANO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
          {form.plano === 'outro' && (
            <input type="text" placeholder="Qual valor você consegue investir hoje?"
              className={`${inputCls} mt-2`} value={form.outrovalor}
              onChange={e => set('outrovalor', e.target.value)} />
          )}
        </div>

        <button type="submit"
          className="w-full rounded-full bg-[#E59313] text-white font-black py-3.5 text-[14px] transition-all duration-250 hover:bg-[#f0a020] hover:shadow-[0_0_40px_rgba(229,147,19,0.45)] hover:scale-[1.01] active:scale-[0.99] mt-1"
          style={{ fontFamily: "'Montserrat', sans-serif" }} data-testid="button-hero-cta">
          Quero meu Diagnóstico Grátis
          <ArrowRight className="inline-block ml-2 w-4 h-4" />
        </button>
        <p className="text-center text-white/20 text-[10.5px]">
          Gratuito · Sem compromisso · Respondemos em até 24h
        </p>
      </form>
    </div>
  );
}

function NivelamentoCTASection() {
  return (
    <section className="relative overflow-hidden bg-[#08090c] border-t border-b border-white/[0.06] py-16 sm:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(229,147,19,0.16),_transparent_35%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.28em] text-[#E59313]">Teste de Nivelamento</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Conheça seu nível real de inglês com um teste CEFR profissional.
            </h2>
            <p className="max-w-2xl text-white/70 text-base sm:text-lg leading-relaxed">
              Responda perguntas focadas em listening, reading, writing e speaking e receba um relatório de nível completo com recomendação de plano.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => window.location.assign('/nivelamento')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E59313] px-6 py-4 text-sm font-black uppercase text-white transition-all duration-200 hover:bg-[#f0a020]"
              >
                Fazer o teste agora
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-sm text-white/40 max-w-md">
                Sem custo extra, criado para profissionais que querem saber exatamente onde investir no inglês.
              </span>
            </div>
          </div>
          <div className="rounded-[32px] border border-white/[0.08] bg-white/5 p-8 text-white shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#E59313] mb-4">O que está incluído</p>
            <ul className="space-y-4 text-sm text-white/75">
              <li>• Avaliação única de 4 habilidades do inglês</li>
              <li>• Relatório de nível CEFR e pontos fortes</li>
              <li>• Plano de estudo antecipado e recomendação de plano</li>
              <li>• Feedback individualizado para fala, leitura e escrita</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Index;
