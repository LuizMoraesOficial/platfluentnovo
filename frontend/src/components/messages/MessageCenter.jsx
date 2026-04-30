import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, Plus, Search, Send, Trash2, Loader2, Inbox, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInboxMessages, useSentMessages, useSendMessage, useMarkMessageRead, useDeleteMessage } from '@/hooks/useMessages';
import { useStudents, useTeachers } from '@/hooks/useStudents';
import { useAuth } from '@/hooks/useAuth';

const PRIORITY_DOT = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };
const PRIORITY_LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa' };

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function MessageCenter() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('inbox');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { data: inbox = [], isLoading: loadingInbox } = useInboxMessages();
  const { data: sent = [], isLoading: loadingSent } = useSentMessages();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessageRead();
  const deleteMutation = useDeleteMessage();

  const unreadCount = inbox.filter(m => !m.is_read).length;

  const recipients = [
    ...teachers.map(t => ({ id: t.id, label: `Prof. ${t.full_name}` })),
    ...students.map(s => ({ id: s.id, label: s.full_name })),
  ].filter(r => r.id !== profile?.id);

  const msgs = tab === 'inbox' ? inbox : sent;
  const loading = tab === 'inbox' ? loadingInbox : loadingSent;

  const filtered = msgs.filter(m =>
    m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (msg) => {
    setSelectedMessage(msg);
    if (!msg.is_read && tab === 'inbox') markReadMutation.mutate(msg.id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await sendMutation.mutateAsync({
        to_user_id: fd.get('recipient'),
        subject: fd.get('subject'),
        content: fd.get('content'),
        priority: fd.get('priority') || 'medium',
      });
      toast({ title: 'Mensagem enviada!' });
      setIsComposeOpen(false);
      e.target.reset();
    } catch (err) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Mensagem removida.' });
        if (selectedMessage?.id === id) setSelectedMessage(null);
      },
      onError: (err) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="db-panel-title" style={{ fontSize: 18 }}>Mensagens</div>
          <div className="db-panel-sub">
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas lidas'}
          </div>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <button className="db-cta" style={{ gap: 6 }}>
              <Plus style={{ width: 13, height: 13 }} />
              Nova Mensagem
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.09)' }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#eeeef0' }}>Compor Mensagem</DialogTitle>
              <DialogDescription style={{ color: '#42424a' }}>
                Envie uma mensagem para outro usuário da plataforma.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSend}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>PARA</label>
                  <Select name="recipient" required>
                    <SelectTrigger><SelectValue placeholder="Selecione o destinatário" /></SelectTrigger>
                    <SelectContent>
                      {recipients.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>ASSUNTO</label>
                  <Input name="subject" placeholder="Assunto da mensagem" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>PRIORIDADE</label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#86868e', fontFamily: 'DM Mono, monospace' }}>MENSAGEM</label>
                  <Textarea name="content" placeholder="Digite sua mensagem..." className="min-h-32" required />
                </div>
              </div>
              <DialogFooter>
                <button className="db-cta" type="submit" disabled={sendMutation.isPending} style={{ gap: 6 }}>
                  {sendMutation.isPending
                    ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                    : <Send style={{ width: 13, height: 13 }} />}
                  Enviar
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <style>{`@media(min-width:1024px){.msg-grid{grid-template-columns:320px 1fr!important}}`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="msg-grid">

          {/* Left — list */}
          <div className="db-panel da1" style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
            <div className="db-panel-inner" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#42424a' }} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar mensagens..."
                  style={{
                    width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#eeeef0', fontSize: 12, outline: 'none', fontFamily: 'DM Sans, sans-serif',
                  }}
                />
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3 }}>
                {[
                  { id: 'inbox', label: 'Entrada', icon: Inbox, count: unreadCount },
                  { id: 'sent', label: 'Enviadas', icon: Mail },
                ].map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      background: tab === id ? 'rgba(255,255,255,0.07)' : 'transparent',
                      color: tab === id ? '#eeeef0' : '#42424a',
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <Icon style={{ width: 12, height: 12 }} />
                    {label}
                    {count > 0 && (
                      <span style={{
                        background: '#ef4444', color: '#fff', borderRadius: 99,
                        fontSize: 9, fontFamily: 'DM Mono, monospace', padding: '1px 5px',
                      }}>{count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <Loader2 style={{ width: 16, height: 16, color: '#E59313' }} className="animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#42424a', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
                    Nenhuma mensagem
                  </div>
                ) : filtered.map(msg => {
                  const isActive = selectedMessage?.id === msg.id;
                  const isUnread = !msg.is_read && tab === 'inbox';
                  return (
                    <button
                      key={msg.id}
                      onClick={() => handleSelect(msg)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px',
                        borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: isActive ? 'rgba(229,147,19,0.08)' : isUnread ? 'rgba(59,130,246,0.05)' : 'transparent',
                        borderLeft: isActive ? '2px solid #E59313' : isUnread ? '2px solid rgba(59,130,246,0.5)' : '2px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: isUnread ? 600 : 500, color: '#eeeef0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                            {msg.subject}
                          </span>
                          <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: '#42424a', flexShrink: 0 }}>
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#42424a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.content}
                        </p>
                      </div>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[msg.priority] || '#42424a', flexShrink: 0, marginTop: 4 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right — detail */}
          <div className="db-panel da2">
            <div className="db-panel-inner" style={{ height: '100%', minHeight: 400 }}>
              {selectedMessage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#eeeef0', lineHeight: 1.3 }}>{selectedMessage.subject}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#42424a' }}>
                          {formatDate(selectedMessage.created_at)}
                        </span>
                        <span className="db-pill" style={{
                          background: (PRIORITY_DOT[selectedMessage.priority] || '#42424a') + '18',
                          borderColor: (PRIORITY_DOT[selectedMessage.priority] || '#42424a') + '40',
                          color: PRIORITY_DOT[selectedMessage.priority] || '#42424a',
                          fontSize: 9,
                        }}>
                          {PRIORITY_LABEL[selectedMessage.priority] || 'Normal'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      style={{
                        padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.07)',
                        border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, flex: 1 }}>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: '#86868e', whiteSpace: 'pre-wrap' }}>
                      {selectedMessage.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, minHeight: 300 }}>
                  <MessageSquare style={{ width: 32, height: 32, color: '#252529' }} />
                  <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#42424a' }}>
                    Selecione uma mensagem
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
