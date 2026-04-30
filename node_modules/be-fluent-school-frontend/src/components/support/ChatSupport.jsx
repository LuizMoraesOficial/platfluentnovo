import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Bot, User, HeadphonesIcon, Phone, Mail, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupportTickets, useCreateSupportTicket } from '@/hooks/useSupportTickets';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

export function ChatSupport() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: tickets = [], isLoading: loadingTickets } = useSupportTickets();
  const createTicketMutation = useCreateSupportTicket();

  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'bot', message: `Olá${profile?.full_name ? ', ' + profile.full_name : ''}! Sou o assistente virtual da Be Fluent School. Como posso ajudá-lo hoje?`, timestamp: new Date() },
    { id: '2', sender: 'bot', message: 'Você pode me perguntar sobre:\n• Horários de aulas\n• Materiais didáticos\n• Problemas técnicos\n• Pagamentos\n• Informações gerais', timestamp: new Date() },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', message: currentMessage, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    const text = currentMessage;
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const history = [...chatMessages, userMsg].map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.message,
      }));
      const { reply } = await apiRequest('/olivia/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: history }),
      });
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'bot', message: reply, timestamp: new Date() }]);
    } catch {
      const fallback = generateFallback(text);
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'bot', message: fallback, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateFallback = (msg) => {
    const m = msg.toLowerCase();
    if (m.includes('aula') || m.includes('horário')) return 'Acesse a seção "Calendário" para ver seus horários e aulas agendadas. 📅';
    if (m.includes('material')) return 'Os materiais estão disponíveis na seção "Materiais" do seu dashboard. 📚';
    if (m.includes('pagamento') || m.includes('mensalidade')) return 'Para questões de pagamento, acesse a seção "Pagamentos" ou abra um ticket de suporte. 💳';
    if (m.includes('meet') || m.includes('link') || m.includes('problema')) return 'Se está com problemas no Google Meet, tente atualizar a página ou usar outro navegador. 🔧';
    return 'Para um atendimento mais personalizado, abra um ticket de suporte no painel. 😊';
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await createTicketMutation.mutateAsync({
        title: fd.get('title'),
        description: fd.get('description'),
        category: fd.get('category'),
        priority: fd.get('priority') || 'medium',
      });
      toast({ title: 'Ticket criado!', description: 'Nossa equipe responderá em breve.' });
      setIsTicketModalOpen(false);
      e.target.reset();
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const statusColor = { open: 'bg-blue-500', in_progress: 'bg-yellow-500', resolved: 'bg-green-500', closed: 'bg-gray-500' };
  const statusLabel = { open: 'Aberto', in_progress: 'Em Andamento', resolved: 'Resolvido', closed: 'Fechado' };
  const priorityColor = { urgent: 'text-red-600', high: 'text-orange-600', medium: 'text-yellow-600', low: 'text-green-600' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <HeadphonesIcon className="h-6 w-6" />
          Central de Suporte
        </h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsChatOpen(!isChatOpen)} variant={isChatOpen ? 'default' : 'outline'} className="transition-all hover:scale-105">
            <MessageCircle className="mr-2 h-4 w-4" />
            Chat Ao Vivo
          </Button>
          <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
            <DialogTrigger asChild>
              <Button className="transition-all hover:scale-105">
                <AlertCircle className="mr-2 h-4 w-4" />
                Abrir Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Ticket de Suporte</DialogTitle>
                <DialogDescription>Descreva seu problema detalhadamente.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTicket}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label>Categoria</label>
                    <Select name="category" required>
                      <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Técnico">🔧 Problema Técnico</SelectItem>
                        <SelectItem value="Financeiro">💳 Financeiro</SelectItem>
                        <SelectItem value="Pedagógico">📚 Pedagógico</SelectItem>
                        <SelectItem value="Geral">💭 Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label>Prioridade</label>
                    <Select name="priority" defaultValue="medium">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">🔴 Urgente</SelectItem>
                        <SelectItem value="high">🟠 Alta</SelectItem>
                        <SelectItem value="medium">🟡 Média</SelectItem>
                        <SelectItem value="low">🟢 Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label>Título</label>
                    <Input name="title" placeholder="Resumo do problema" required />
                  </div>
                  <div className="grid gap-2">
                    <label>Descrição</label>
                    <Textarea name="description" placeholder="Descreva o problema detalhadamente..." className="min-h-24" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createTicketMutation.isPending}>
                    {createTicketMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Criar Ticket
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded"><HeadphonesIcon className="h-5 w-5 text-green-600" /></div>
              <div><p className="font-semibold">Suporte interno</p><p className="text-sm text-muted-foreground">Abra um ticket para atendimento formal</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded"><Bot className="h-5 w-5 text-blue-600" /></div>
              <div><p className="font-semibold">Assistente virtual</p><p className="text-sm text-muted-foreground">Primeiro atendimento automatizado</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded"><Clock className="h-5 w-5 text-purple-600" /></div>
              <div><p className="font-semibold">Resposta em até 48h</p><p className="text-sm text-muted-foreground">Baseado no fluxo de tickets</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {isChatOpen && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Chat com Assistente Virtual
              </CardTitle>
              <CardDescription>Resposta instantânea para dúvidas comuns (powered by OlivIA)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 border rounded-lg flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`p-2 rounded-full ${msg.sender === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {msg.sender === 'user' ? <User className="h-4 w-4 text-blue-600" /> : <Bot className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div className={`max-w-xs lg:max-w-md ${msg.sender === 'user' ? 'text-right' : ''}`}>
                        <div className={`p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-gray-100"><Bot className="h-4 w-4 text-gray-600" /></div>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <div className="flex gap-1">
                          {[0, 0.1, 0.2].map((d, i) => (
                            <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t p-3 flex gap-2">
                  <Input
                    value={currentMessage}
                    onChange={e => setCurrentMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} size="sm" disabled={isTyping}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={isChatOpen ? '' : 'lg:col-span-3'}>
          <CardHeader>
            <CardTitle>Meus Tickets</CardTitle>
            <CardDescription>Histórico de solicitações de suporte</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum ticket aberto</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{ticket.title}</h4>
                        <p className="text-xs text-muted-foreground">{ticket.category}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={`${statusColor[ticket.status]} text-white border-none text-xs`}>
                          {statusLabel[ticket.status] ?? ticket.status}
                        </Badge>
                        <span className={`text-xs font-medium ${priorityColor[ticket.priority]}`}>{ticket.priority?.toUpperCase()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ticket.description}</p>
                    <span className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
