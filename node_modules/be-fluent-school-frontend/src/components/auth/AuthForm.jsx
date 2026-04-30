import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await signIn(loginData.username, loginData.password);
      
      if (error) {
        toast({
          title: 'Erro no login',
          description: error.message === 'Invalid credentials' 
            ? 'Usuário ou senha incorretos' 
            : error.message,
          variant: 'destructive',
        });
      } else if (data?.user && data?.profile) {
        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo à Be Fluent School',
        });

        const redirectPath = data.profile.must_change_password ? '/auth/change-password' : '/dashboard';
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 200);
      }
    } catch (error) {
      toast({
        title: 'Erro no login',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <form onSubmit={handleLogin} className="space-y-4 xs:space-y-6 w-full max-w-md">
      <div className="space-y-3 xs:space-y-4">
        <div className="space-y-1.5 xs:space-y-2">
          <Label 
            htmlFor="username" 
            className="text-white font-medium text-sm xs:text-base touch-manipulation"
          >
            E-mail
          </Label>
          <Input
            id="username"
            name="username"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="seu@email.com"
            value={loginData.username}
            onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
            required
            className="
              bg-white/10 border-white/20 text-white placeholder:text-white/50 
              focus:border-white/40 focus:ring-2 focus:ring-white/20
              h-12 xs:h-14 text-base px-4
              touch-manipulation tap-highlight-transparent
              transition-all duration-200
            "
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
            data-testid="input-username"
          />
        </div>
        <div className="space-y-1.5 xs:space-y-2">
          <Label 
            htmlFor="password" 
            className="text-white font-medium text-sm xs:text-base touch-manipulation"
          >
            Senha
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="••••••••"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            required
            className="
              bg-white/10 border-white/20 text-white placeholder:text-white/50 
              focus:border-white/40 focus:ring-2 focus:ring-white/20
              h-12 xs:h-14 text-base px-4
              touch-manipulation tap-highlight-transparent
              transition-all duration-200
            "
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
            data-testid="input-password"
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="
          w-full bg-white text-brand-navy hover:bg-white/90 
          font-medium text-base xs:text-lg
          h-12 xs:h-14 px-6
          transition-all duration-300 hover-lift
          touch-target touch-manipulation tap-highlight-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:ring-2 focus:ring-white/50 focus:outline-none
          shadow-lg hover:shadow-xl
          min-h-[48px]
        " 
        disabled={isLoading} 
        data-testid="button-login"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <span className={isLoading ? 'opacity-75' : ''}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </span>
      </Button>
    </form>
  );
}