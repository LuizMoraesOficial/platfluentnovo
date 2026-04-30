import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';

export default function ChangePassword() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formState, setFormState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile && profile.must_change_password !== true) {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formState.newPassword !== formState.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'A nova senha e a confirmação precisam ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    if (formState.newPassword.length < 8) {
      toast({
        title: 'Senha fraca',
        description: 'A senha precisa ter pelo menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast({
          title: 'Não foi possível alterar a senha',
          description: result.message || 'Verifique seus dados e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso. Você será redirecionado ao painel.',
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d14] px-4 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#14141d] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/15 text-orange-400">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-white">Atenção: senha temporária</h1>
          <p className="mt-2 text-sm text-slate-400">
            Para continuar, altere sua senha provisória agora. Isso garante segurança e acesso contínuo à sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm text-slate-300">Senha atual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={formState.currentPassword}
              onChange={(event) => setFormState({ ...formState, currentPassword: event.target.value })}
              placeholder="Digite sua senha atual"
              required
              className="bg-slate-900/80 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm text-slate-300">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={formState.newPassword}
              onChange={(event) => setFormState({ ...formState, newPassword: event.target.value })}
              placeholder="Digite a nova senha"
              required
              className="bg-slate-900/80 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-slate-300">Confirme a nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formState.confirmPassword}
              onChange={(event) => setFormState({ ...formState, confirmPassword: event.target.value })}
              placeholder="Repita a nova senha"
              required
              className="bg-slate-900/80 border-slate-700 text-white"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Sua senha deve ter no mínimo 8 caracteres.
            </p>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Alterar senha'}
            </Button>
          </div>
        </form>

        <div className="mt-8 rounded-3xl bg-slate-950/50 p-5 text-sm text-slate-400">
          <div className="flex items-center gap-2 text-slate-100 font-semibold mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Importante
          </div>
          <p>Ao alterar sua senha, o indicador de senha temporária é removido e você terá acesso normal ao painel.</p>
        </div>
      </div>
    </div>
  );
}
