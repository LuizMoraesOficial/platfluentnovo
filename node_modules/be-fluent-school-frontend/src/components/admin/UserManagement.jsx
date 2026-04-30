import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Users, UserPlus, Search, Edit, Trash2, Mail, Phone, Calendar, Crown, Award, MapPin, FileText, AlertCircle, CheckCircle, GraduationCap, DollarSign, ArrowLeft, ArrowRight, Star, Zap, Diamond, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ── Wizard de criação de usuário ─────────────────────────────────────────────

const PLANS = [
  { id: 'bronze',  label: 'Bronze',  icon: Star,    color: '#cd7f32', desc: 'Plano inicial, 4 aulas/mês' },
  { id: 'silver',  label: 'Silver',  icon: Star,    color: '#9e9e9e', desc: 'Plano intermediário, 8 aulas/mês' },
  { id: 'gold',    label: 'Gold',    icon: Trophy,  color: '#E59313', desc: 'Plano avançado, 12 aulas/mês' },
  { id: 'diamond', label: 'Diamond', icon: Diamond, color: '#5ec8f0', desc: 'Plano premium, 16 aulas/mês' },
  { id: 'vip',     label: 'VIP',     icon: Zap,     color: '#a855f7', desc: 'Plano ilimitado, aulas sob demanda' },
];

const ROLE_CARDS = [
  {
    role: 'student',
    icon: GraduationCap,
    label: 'Aluno',
    desc: 'Cadastra um novo aluno com plano de aulas e valor mensal.',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.3)',
  },
  {
    role: 'teacher',
    icon: Award,
    label: 'Professor',
    desc: 'Cadastra um professor com tipo de ensino e valor/hora.',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.3)',
  },
  {
    role: 'admin',
    icon: Crown,
    label: 'Administrador',
    desc: 'Acesso completo ao painel de gestão da plataforma.',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.3)',
  },
];

function CreateUserWizard({ open, onClose, onSubmit, isLoading, createdPassword }) {
  const [step, setStep] = useState(1); // 1=tipo, 2=dados, 3=sucesso
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('gold');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  // Reset ao abrir
  useEffect(() => {
    if (open) { setStep(1); setSelectedRole(null); setFormData({}); setErrors({}); setSelectedPlan('gold'); }
  }, [open]);

  // Notificar sucesso quando createdPassword chega
  useEffect(() => {
    if (createdPassword && step === 2) setStep(3);
  }, [createdPassword]);

  const formatPhone = (v) => v.replace(/\D/g,'').replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4,5})(\d{4})$/,'$1-$2');
  const formatCPF = (v) => v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})/,'$1-$2').replace(/(-\d{2})\d+?$/,'$1');

  const validateStep2 = () => {
    const e = {};
    if (!formData.full_name || formData.full_name.trim().length < 2) e.full_name = 'Nome deve ter pelo menos 2 caracteres';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email inválido';
    if (!formData.phone || formData.phone.replace(/\D/g,'').length < 10) e.phone = 'Telefone deve ter pelo menos 10 dígitos';
    if (selectedRole === 'teacher' && (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0)) e.hourly_rate = 'Informe o valor por hora';
    if (selectedRole === 'student' && (!formData.monthly_fee || parseFloat(formData.monthly_fee) <= 0)) e.monthly_fee = 'Informe o valor mensal';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && selectedRole) setStep(2);
    else if (step === 2 && validateStep2()) {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        cpf: formData.cpf || null,
        address: formData.address || null,
        birth_date: formData.birth_date || null,
        role: selectedRole,
        ...(selectedRole === 'teacher' && {
          teacher_type: formData.teacher_type || 'individual',
          hourly_rate: Math.round(parseFloat(formData.hourly_rate) * 100),
        }),
        ...(selectedRole === 'student' && {
          english_level: formData.english_level || 'beginner',
          plan_type: selectedPlan,
          monthly_fee: Math.round(parseFloat(formData.monthly_fee) * 100),
          current_module: formData.current_module || 'S1',
          current_activity: Number(formData.current_activity) || 1,
        }),
      };
      onSubmit(payload);
    }
  };

  const field = (key, label, opts = {}) => (
    <div className="space-y-1">
      <Label htmlFor={key} style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0' }}>
        {label}{opts.required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </Label>
      <Input
        id={key}
        type={opts.type || 'text'}
        placeholder={opts.placeholder || ''}
        value={formData[key] || ''}
        onChange={e => {
          let v = e.target.value;
          if (key === 'phone') v = formatPhone(v);
          if (key === 'cpf') v = formatCPF(v);
          setFormData(p => ({ ...p, [key]: v }));
          if (errors[key]) setErrors(p => { const n = {...p}; delete n[key]; return n; });
        }}
        style={{
          background: '#1c1c22',
          border: errors[key] ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
          color: '#eeeef0',
          borderRadius: 8,
          fontSize: 13,
        }}
      />
      {errors[key] && <p style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle style={{ width: 10, height: 10 }} />{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        style={{
          background: '#13131a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          maxWidth: step === 1 ? 560 : 640,
          padding: 0,
          overflowX: 'hidden',
        }}
        className="max-h-[90vh] overflow-y-auto scrollbar-visible"
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(229,147,19,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus style={{ width: 18, height: 18, color: '#E59313' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#eeeef0', margin: 0 }}>Criar Novo Usuário</h2>
              <p style={{ fontSize: 12, color: '#5a5a6e', margin: 0 }}>
                {step === 1 ? 'Escolha o tipo de conta' : step === 2 ? `Dados do ${ROLE_CARDS.find(r=>r.role===selectedRole)?.label}` : 'Usuário criado com sucesso'}
              </p>
            </div>
          </div>
          {/* Progress dots */}
          {step < 3 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2].map(s => (
                <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: s <= step ? '#E59313' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 28 }}>
          {/* ── Step 1: Tipo ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ROLE_CARDS.map(card => (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => setSelectedRole(card.role)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: selectedRole === card.role ? `1.5px solid ${card.color}` : `1px solid ${card.border}`,
                    background: selectedRole === card.role ? card.bg : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s',
                    width: '100%',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <card.icon style={{ width: 22, height: 22, color: card.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: selectedRole === card.role ? card.color : '#eeeef0', margin: 0 }}>{card.label}</p>
                    <p style={{ fontSize: 12, color: '#5a5a6e', margin: 0, marginTop: 2 }}>{card.desc}</p>
                  </div>
                  {selectedRole === card.role && (
                    <CheckCircle style={{ width: 18, height: 18, color: card.color, flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Dados ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Dados comuns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('full_name', 'Nome Completo', { required: true, placeholder: 'João Silva dos Santos' })}
                {field('email', 'Email', { required: true, type: 'email', placeholder: 'joao@email.com' })}
                {field('phone', 'Telefone', { required: true, placeholder: '(11) 99999-9999' })}
                {field('cpf', 'CPF', { placeholder: '000.000.000-00' })}
              </div>
              {field('birth_date', 'Data de Nascimento', { type: 'date' })}
              {field('address', 'Endereço', { placeholder: 'Rua, número, bairro, cidade – UF' })}

              <Separator style={{ background: 'rgba(255,255,255,0.06)' }} />

              {/* Dados específicos por role */}
              {selectedRole === 'teacher' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Dados do Professor</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="space-y-1">
                      <Label style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0' }}>Tipo de Ensino</Label>
                      <Select value={formData.teacher_type || 'individual'} onValueChange={v => setFormData(p => ({ ...p, teacher_type: v }))}>
                        <SelectTrigger style={{ background: '#1c1c22', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0', fontSize: 13, borderRadius: 8 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Aulas Individuais</SelectItem>
                          <SelectItem value="group">Aulas em Grupo</SelectItem>
                          <SelectItem value="both">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0' }}>Valor por Hora (R$)<span style={{ color: '#ef4444', marginLeft: 3 }}>*</span></Label>
                      <Input
                        type="number"
                        placeholder="85.00"
                        step="0.01"
                        value={formData.hourly_rate || ''}
                        onChange={e => { setFormData(p => ({ ...p, hourly_rate: e.target.value })); if (errors.hourly_rate) setErrors(p => { const n={...p}; delete n.hourly_rate; return n; }); }}
                        style={{ background: '#1c1c22', border: errors.hourly_rate ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)', color: '#eeeef0', fontSize: 13, borderRadius: 8 }}
                      />
                      {errors.hourly_rate && <p style={{ fontSize: 11, color: '#ef4444' }}>{errors.hourly_rate}</p>}
                    </div>
                  </div>
                </div>
              )}

              {selectedRole === 'student' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Dados do Aluno</p>

                  {/* Nível + Mensalidade */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="space-y-1">
                      <Label style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0' }}>Nível de Inglês (CEFR)</Label>
                      <Select value={formData.english_level || 'beginner'} onValueChange={v => setFormData(p => ({ ...p, english_level: v }))}>
                        <SelectTrigger style={{ background: '#1c1c22', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0', fontSize: 13, borderRadius: 8 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Start — A1 (Iniciante)</SelectItem>
                          <SelectItem value="elementary">Start — A2 (Básico)</SelectItem>
                          <SelectItem value="pre_intermediate">Intermediate — B1 (Pré-Int.)</SelectItem>
                          <SelectItem value="intermediate">Intermediate — B1/B2</SelectItem>
                          <SelectItem value="upper_intermediate">Advanced — B2/C1</SelectItem>
                          <SelectItem value="advanced">Advanced — C1 (Avançado)</SelectItem>
                          <SelectItem value="proficiency">Advanced — C2 (Proficiência)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0' }}>Valor Mensal (R$)<span style={{ color: '#ef4444', marginLeft: 3 }}>*</span></Label>
                      <Input
                        type="number"
                        placeholder="350.00"
                        step="0.01"
                        value={formData.monthly_fee || ''}
                        onChange={e => { setFormData(p => ({ ...p, monthly_fee: e.target.value })); if (errors.monthly_fee) setErrors(p => { const n={...p}; delete n.monthly_fee; return n; }); }}
                        style={{ background: '#1c1c22', border: errors.monthly_fee ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)', color: '#eeeef0', fontSize: 13, borderRadius: 8 }}
                      />
                      {errors.monthly_fee && <p style={{ fontSize: 11, color: '#ef4444' }}>{errors.monthly_fee}</p>}
                    </div>
                  </div>

                  {/* Módulo inicial + Atividade inicial */}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(229,147,19,0.06)', border: '1px solid rgba(229,147,19,0.15)' }}>
                    <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#E59313', marginBottom: 10 }}>POSIÇÃO INICIAL NO CURRÍCULO BE FLUENT</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="space-y-1">
                        <Label style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0' }}>Módulo Inicial<span style={{ color: '#ef4444', marginLeft: 3 }}>*</span></Label>
                        <Select value={formData.current_module || 'S1'} onValueChange={v => setFormData(p => ({ ...p, current_module: v }))}>
                          <SelectTrigger style={{ background: '#1c1c22', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0', fontSize: 13, borderRadius: 8 }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { id: 'S1', label: 'S1 — Start 1 (A1)' }, { id: 'S2', label: 'S2 — Start 2 (A1)' }, { id: 'S3', label: 'S3 — Start 3 (A2)' },
                              { id: 'I1', label: 'I1 — Intermediate 1 (B1)' }, { id: 'I2', label: 'I2 — Intermediate 2 (B1)' }, { id: 'I3', label: 'I3 — Intermediate 3 (B2)' },
                              { id: 'AD1', label: 'AD1 — Advanced 1 (B2)' }, { id: 'AD2', label: 'AD2 — Advanced 2 (C1)' }, { id: 'AD3', label: 'AD3 — Advanced 3 (C1)' }, { id: 'AD4', label: 'AD4 — Extra Module (C2)' },
                            ].map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0' }}>Atividade Inicial<span style={{ color: '#ef4444', marginLeft: 3 }}>*</span></Label>
                        <Select value={String(formData.current_activity || '1')} onValueChange={v => setFormData(p => ({ ...p, current_activity: v }))}>
                          <SelectTrigger style={{ background: '#1c1c22', border: '1px solid rgba(255,255,255,0.1)', color: '#eeeef0', fontSize: 13, borderRadius: 8 }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                              <SelectItem key={n} value={String(n)}>Atividade {n}{[6,11,20].includes(n) ? ' ⭐' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#5a5a6e', marginTop: 8, lineHeight: 1.5 }}>
                      As 20 atividades do módulo serão criadas automaticamente. O perfil será atualizado conforme o professor registrar o progresso das aulas.
                    </p>
                  </div>
                  {/* Seleção de plano */}
                  <div>
                    <Label style={{ fontSize: 12, fontWeight: 500, color: '#a0a0b0', display: 'block', marginBottom: 8 }}>Plano de Aulas<span style={{ color: '#ef4444', marginLeft: 3 }}>*</span></Label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {PLANS.map(plan => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: selectedPlan === plan.id ? `1.5px solid ${plan.color}` : '1px solid rgba(255,255,255,0.08)',
                            background: selectedPlan === plan.id ? `${plan.color}15` : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                            flex: 1,
                            minWidth: 70,
                            transition: 'all 0.15s',
                          }}
                        >
                          <plan.icon style={{ width: 16, height: 16, color: plan.color }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: selectedPlan === plan.id ? plan.color : '#86868e' }}>{plan.label}</span>
                        </button>
                      ))}
                    </div>
                    {selectedPlan && (
                      <p style={{ fontSize: 11, color: '#5a5a6e', marginTop: 6 }}>
                        {PLANS.find(p => p.id === selectedPlan)?.desc}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Sucesso ── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle style={{ width: 32, height: 32, color: '#22c55e' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#eeeef0', marginBottom: 8 }}>Usuário criado com sucesso!</h3>
              <p style={{ fontSize: 13, color: '#5a5a6e', marginBottom: 20 }}>
                Um email com as credenciais foi enviado para <strong style={{ color: '#a0a0b0' }}>{formData.email}</strong>.
              </p>
              {createdPassword && (
                <div style={{ background: 'rgba(229,147,19,0.08)', border: '1px solid rgba(229,147,19,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#E59313', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Senha temporária gerada</p>
                  <p style={{ fontSize: 13, color: '#eeeef0', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 6 }}>{createdPassword}</p>
                  <p style={{ fontSize: 11, color: '#5a5a6e' }}>O usuário deverá trocar esta senha no primeiro acesso.</p>
                </div>
              )}
              <Button onClick={onClose} style={{ background: '#E59313', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 600, cursor: 'pointer' }}>
                Fechar
              </Button>
            </div>
          )}
        </div>

        {/* Footer com navegação */}
        {step < 3 && (
          <div style={{ padding: '0 28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => step === 1 ? onClose() : setStep(1)}
              style={{ color: '#5a5a6e', fontSize: 13 }}
            >
              {step === 1 ? 'Cancelar' : <><ArrowLeft style={{ width: 14, height: 14, marginRight: 6 }} />Voltar</>}
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={step === 1 ? !selectedRole : isLoading}
              style={{
                background: step === 1 ? (selectedRole ? '#E59313' : 'rgba(255,255,255,0.06)') : '#E59313',
                color: step === 1 ? (selectedRole ? '#fff' : '#5a5a6e') : '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 600,
                cursor: (step === 1 && !selectedRole) || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isLoading ? 'Criando...' : step === 1 ? <>Próximo<ArrowRight style={{ width: 14, height: 14 }} /></> : <>Criar Usuário<CheckCircle style={{ width: 14, height: 14 }} /></>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function UserManagement({ userRole = 'admin'  }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch real users from API
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['/api/profiles'],
    queryFn: () => apiRequest('/profiles'),
  });

  // Transform profiles to user format
  const users = profiles.map((profile) => ({
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    phone: profile.phone || '',
    role: profile.role,
    status: profile.is_active ? 'active' : 'inactive',
    joinDate: new Date(profile.created_at),
    lastLogin: new Date(), // TODO: implement last_login tracking
  }));

  // Add mutation for creating users
  const createUserMutation = useMutation({
    mutationFn: (userData) => apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      setCreatedTempPassword(data?.temporaryPassword || null);
      toast({
        title: 'Usuário criado',
        description: 'O usuário foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add mutation for updating users
  const updateUserMutation = useMutation({ mutationFn: ({ id, data }) =>
      apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({
        title: 'Usuário atualizado',
        description: 'Os dados do usuário foram atualizados com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add mutation for deleting users
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => apiRequest(`/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      toast({
        title: 'Usuário removido',
        description: 'O usuário foi removido com sucesso.',
      });
      setIsDeleteConfirmOpen(false);
      setDeletingUser(null);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messagingUser, setMessagingUser] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);


  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = (payload) => {
    setCreatedTempPassword(null);
    createUserMutation.mutate(payload);
  };

  const handleDeleteUser = (userId) => {
    if (!userId) return;
    deleteUserMutation.mutate(userId);
  };

  const handleToggleStatus = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const nowActive = user.status === 'active';
    updateUserMutation.mutate({ id: userId, data: { is_active: !nowActive } });
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        full_name: formData.get('edit_name'),
        email: formData.get('edit_email'),
        phone: formData.get('edit_phone') || null,
        role: formData.get('edit_role'),
      }
    });
  };

  const handleOpenMessage = (user) => {
    setMessagingUser(user);
    setIsMessageDialogOpen(true);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipient_id: messagingUser.id,
          subject: formData.get('msg_subject'),
          content: formData.get('msg_content'),
        }),
      });
      setIsMessageDialogOpen(false);
      setMessagingUser(null);
      toast({ title: 'Mensagem enviada', description: `Mensagem enviada para ${messagingUser.name}.` });
    } catch (err) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    }
  };

  const handleOpenDelete = (user) => {
    setDeletingUser(user);
    setIsDeleteConfirmOpen(true);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-purple-600" />;
      case 'teacher': return <Award className="h-4 w-4 text-blue-600" />;
      case 'student': return <Users className="h-4 w-4 text-green-600" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Professor';
      case 'student': return 'Aluno';
      default: return 'Usuário';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'suspended': return 'Suspenso';
      default: return 'Desconhecido';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const formatLastLogin = (date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');
  const activeUsers = users.filter(u => u.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestão de Usuários
        </h2>
          <Button
            onClick={() => { setCreatedTempPassword(null); setIsCreateUserOpen(true); }}
            className="transition-all hover:scale-105"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
          <CreateUserWizard
            open={isCreateUserOpen}
            onClose={() => setIsCreateUserOpen(false)}
            onSubmit={handleCreateUser}
            isLoading={createUserMutation.isPending}
            createdPassword={createdTempPassword}
          />
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teachers.length}</p>
                <p className="text-sm text-muted-foreground">Professores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Alunos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded">
                <Users className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers.length}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Professor</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Gerencie todos os usuários da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead>Estatísticas</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span>{getRoleLabel(user.role)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(user.status)} text-white border-none`}
                    >
                      {getStatusLabel(user.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatLastLogin(user.lastLogin)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {user.role === 'teacher' && <span>Professor</span>}
                      {user.role === 'student' && <span>Aluno</span>}
                      {user.role === 'admin' && <span>Admin</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" title="Editar usuário" onClick={() => handleOpenEdit(user)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Enviar mensagem" onClick={() => handleOpenMessage(user)}>
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Excluir usuário"
                        onClick={() => handleOpenDelete(user)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Diálogo de Edição ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize os dados de {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input name="edit_name" defaultValue={editingUser.name} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="edit_email" type="email" defaultValue={editingUser.email} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input name="edit_phone" defaultValue={editingUser.phone || ''} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Usuário</Label>
                <Select name="edit_role" defaultValue={editingUser.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="teacher">Professor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  defaultChecked={editingUser.status === 'active'}
                  onCheckedChange={(checked) => handleToggleStatus(editingUser.id)}
                />
                <Label className="text-sm">Usuário ativo</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de Mensagem ── */}
      <Dialog open={isMessageDialogOpen} onOpenChange={(open) => { setIsMessageDialogOpen(open); if (!open) setMessagingUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar Mensagem
            </DialogTitle>
            <DialogDescription>
              Enviar mensagem para {messagingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input name="msg_subject" placeholder="Ex: Informações sobre sua conta" required />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea name="msg_content" placeholder="Digite sua mensagem..." className="min-h-[120px]" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMessageDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">
                <Mail className="mr-2 h-4 w-4" />
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de Confirmação de Exclusão ── */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => { setIsDeleteConfirmOpen(open); if (!open) setDeletingUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente <strong>{deletingUser?.name}</strong> do sistema? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteUser(deletingUser?.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Removendo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}