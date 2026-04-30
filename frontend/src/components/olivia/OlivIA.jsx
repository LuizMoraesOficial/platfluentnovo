import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm OlivIA, your personal English tutor at Be Fluent School! 🎓\n\nI'm here to help you practice your English. We can:\n• Have a conversation in English\n• Practice professional dialogues (meetings, presentations, travel)\n• Clarify grammar and vocabulary doubts\n• Simulate real-life scenarios\n\nHow can I help you today? Feel free to write in English — or Portuguese if you need to ask something! 😊",
};

export function OlivIA({ studentName = 'Aluno' }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { reply } = await apiRequest('/olivia/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: updatedMessages }),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      toast({
        title: 'OlivIA indisponível',
        description: err.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">OlivIA</h2>
          <p className="text-sm text-muted-foreground">Sua tutora de inglês com IA — Be Fluent School</p>
        </div>
        <Badge variant="secondary" className="ml-auto">Online</Badge>
      </div>

      <Card className="flex flex-col" style={{ height: '70vh' }}>
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Conversa com OlivIA
          </CardTitle>
          <CardDescription>Practice your English — escreva em inglês e OlivIA te ajuda a evoluir</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`p-2 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-primary/10' : 'bg-muted'}`}>
                  {msg.role === 'user'
                    ? <User className="h-4 w-4 text-primary" />
                    : <Bot className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <div key={i} className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message in English..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by OpenAI • OlivIA pode cometer erros — sempre verifique informações importantes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
