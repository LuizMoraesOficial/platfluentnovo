import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star, MessageSquare, Plus, Send, BookOpen, User, Loader2, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const TYPE_COLORS = { general: '#3b82f6', class: '#22c55e', teacher: '#a855f7' };
const TYPE_LABELS = { general: 'Geral', class: 'Aula', teacher: 'Professor' };
const STATUS_CONFIG = {
  sent: { label: 'Aguardando', color: '#eab308' },
  responded: { label: 'Respondido', color: '#22c55e' },
  resolved: { label: 'Resolvido', color: '#86868e' },
};

function Stars({ value, interactive = false, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          onClick={() => interactive && onChange?.(n)}
          style={{
            width: 14, height: 14, cursor: interactive ? 'pointer' : 'default',
            color: n <= value ? '#E59313' : '#252529',
            fill: n <= value ? '#E59313' : 'transparent',
            transition: 'color 0.1s',
          }}
        />
      ))}
    </div>
  );
}

export function StudentFeedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['/api/feedbacks'],
    queryFn: () => apiRequest('/feedbacks'),
    staleTime: 120_000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('/feedbacks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedbacks'] });
      setIsFeedbackOpen(false);
      setRating(0);
      toast({ title: 'Feedback enviado com sucesso!' });
    },
    onError: (e) => toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) { toast({ title: 'Selecione uma avaliação', variant: 'destructive' }); return; }
    const fd = new FormData(e.target);
    createMutation.mutate({
      type: fd.get('type'),
      subject: fd.get('subject'),
      content: fd.get('content'),
      rating,
      teacherName: fd.get('teacherName') || undefined,
      className: fd.get('className') || undefined,
    });
  };

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
    : '—';
  const respondedCount = feedbacks.filter(f => f.status === 'responded' || f.status === 'resolved').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="db-panel-title" style={{ fontSize: 18 }}>Meus Feedbacks</div>
          <div className="db-panel-sub">{feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''} enviado{feedbacks.length !== 1 ? 's' : ''}</div>
        </div>
        <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
          <DialogTrigger asChild>
            <button className="db-cta" style={{ gap: 6 }}>
              <Plus style={{ width: 13, height: 13 }} />
              Novo Feedback
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.09)' }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#eeeef0' }}>Enviar Feedback</DialogTitle>
              <DialogDescription style={{ color: '#42424a' }}>
                Compartilhe sua experiência e ajude-nos a melhorar.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>TIPO</label>
                  <Select name="type" required>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral — Escola / Plataforma</SelectItem>
                      <SelectItem value="class">Sobre uma Aula</SelectItem>
                      <SelectItem value="teacher">Sobre um Professor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>ASSUNTO</label>
                  <Input name="subject" placeholder="Ex: Excelente metodologia" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>AVALIAÇÃO</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Stars value={rating} interactive onChange={setRating} />
                    <span style={{ fontSize: 11, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>
                      {rating > 0 ? `${rating}/5` : 'obrigatório'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>PROFESSOR (opcional)</label>
                  <Input name="teacherName" placeholder="Nome do professor" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>AULA (opcional)</label>
                  <Input name="className" placeholder="Nome da aula" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>DETALHES</label>
                  <Textarea name="content" placeholder="Descreva sua experiência..." className="min-h-[90px]" required />
                </div>
              </div>
              <DialogFooter>
                <button className="db-cta" type="submit" disabled={createMutation.isPending || rating === 0} style={{ gap: 6 }}>
                  {createMutation.isPending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Send style={{ width: 13, height: 13 }} />}
                  Enviar
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Enviados', value: feedbacks.length, color: '#3b82f6', icon: MessageSquare },
          { label: 'Respondidos', value: respondedCount, color: '#22c55e', icon: CheckCircle },
          { label: 'Média', value: avgRating, color: '#E59313', icon: Star },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <div key={label} className={`db-kpi da${i+1}`} style={{ '--kpi-accent': color + '30', padding: 14 }}>
            <div className="db-kpi-icon" style={{ background: color + '12', borderColor: color + '25', color, width: 28, height: 28, borderRadius: 7 }}>
              <Icon style={{ width: 12, height: 12 }} />
            </div>
            <div className="db-kpi-num" style={{ fontSize: '1.4rem', marginTop: 10 }}>{value}</div>
            <div className="db-kpi-label" style={{ fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 style={{ width: 18, height: 18, color: '#E59313' }} className="animate-spin" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="db-panel">
          <div className="db-panel-inner" style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <MessageSquare style={{ width: 28, height: 28, color: '#252529' }} />
            <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a' }}>Nenhum feedback enviado</span>
            <button className="db-ghost" onClick={() => setIsFeedbackOpen(true)} style={{ gap: 5 }}>
              <Plus style={{ width: 11, height: 11 }} /> Enviar primeiro feedback
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {feedbacks.map((fb, i) => {
            const typeColor = TYPE_COLORS[fb.type] || '#86868e';
            const statusCfg = STATUS_CONFIG[fb.status] || STATUS_CONFIG.sent;
            return (
              <div key={fb.id} className={`db-panel da${(i % 4)+1}`}>
                <div className="db-panel-inner">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="db-pill" style={{ background: typeColor + '10', borderColor: typeColor + '28', color: typeColor, fontSize: 9 }}>
                        {TYPE_LABELS[fb.type] || fb.type}
                      </span>
                      <span className="db-pill" style={{ background: statusCfg.color + '10', borderColor: statusCfg.color + '28', color: statusCfg.color, fontSize: 9 }}>
                        {statusCfg.label}
                      </span>
                      <Stars value={fb.rating || 0} />
                    </div>
                    <span style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                      {new Date(fb.created_at || fb.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 13.5, fontWeight: 600, color: '#eeeef0', marginBottom: 6 }}>{fb.subject}</h4>

                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: fb.response ? 8 : 0 }}>
                    <p style={{ fontSize: 12, color: '#86868e', lineHeight: 1.6 }}>{fb.content}</p>
                  </div>

                  {fb.response && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#22c55e', marginBottom: 4 }}>RESPOSTA DA ESCOLA</p>
                      <p style={{ fontSize: 12, color: '#86868e', lineHeight: 1.6 }}>{fb.response}</p>
                    </div>
                  )}

                  {fb.status === 'sent' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      <Clock style={{ width: 11, height: 11, color: '#42424a' }} />
                      <span style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace' }}>Aguardando resposta da equipe</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
