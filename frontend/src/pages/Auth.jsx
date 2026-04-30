import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { BrandHeader } from '@/components/layout/BrandHeader';
import { CheckCircle, Users, BookOpen, Star, MessageCircle, Monitor, Globe, Zap } from 'lucide-react';
import beFluentLogo from '@/assets/be-fluent-logo-brand.png';

export default function Auth() {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      if (profile?.must_change_password === true) {
        navigate('/auth/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2b2b2b' }}>
      <BrandHeader showLoginButton={false} />
      <div className="min-h-screen flex relative pt-16 lg:pt-0">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-brand-orange rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-400 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Left Side - Brand Hero */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm">
                    <img 
                      src={beFluentLogo} 
                      alt="Be Fluent School Logo" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-4xl font-display bg-gradient-to-r from-orange-300 to-yellow-300 bg-clip-text text-transparent">
                      Be Fluent
                    </h1>
                    <p className="text-xl text-white/90 font-body">Performance English</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-3xl font-display">
                    Fale com clareza, performe com potência
                  </h2>
                  <p className="text-lg text-white/90 max-w-lg leading-relaxed font-body">
                    Programa de desenvolvimento comunicativo em inglês para profissionais 
                    que buscam performance real em ambientes corporativos e internacionais.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm hover-lift">
                  <Monitor className="h-6 w-6 text-blue-300 mb-2" />
                  <p className="text-sm font-medium">Aulas ao Vivo</p>
                  <p className="text-xs text-white/70">100% Online</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm hover-lift">
                  <MessageCircle className="h-6 w-6 text-green-300 mb-2" />
                  <p className="text-sm font-medium">Metodologia</p>
                  <p className="text-xs text-white/70">Focada na Fala</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm hover-lift">
                  <Globe className="h-6 w-6 text-purple-300 mb-2" />
                  <p className="text-sm font-medium">Flexibilidade</p>
                  <p className="text-xs text-white/70">Total de Horários</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm hover-lift">
                  <Zap className="h-6 w-6 text-yellow-300 mb-2" />
                  <p className="text-sm font-medium">Progresso</p>
                  <p className="text-xs text-white/70">Rápido e Estruturado</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                      <span className="font-medium">4.9/5 avaliação</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-300" />
                      <span className="font-medium">500+ alunos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-300" />
                    <span className="text-sm text-white/80">Fundado por Isabella Estrela Maciel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative z-10">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:hidden">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-14 h-14 overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm">
                  <img 
                    src={beFluentLogo} 
                    alt="Be Fluent School Logo" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-white">Be Fluent</h1>
                  <p className="text-sm text-white/70">Fale inglês com confiança</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-3">
                Acesse seu painel
              </h2>
              <p className="text-white/80">
                Faça login para continuar suas aulas e agendar seu Power Talk gratuito
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
              <AuthForm />
            </div>
            
            <div className="text-center">
              <div className="bg-white/5 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                <p className="text-sm text-white/80 mb-2">
                  Ainda não é aluno?
                </p>
                <button 
                  className="bg-brand-red hover:bg-brand-red/80 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 hover-lift shadow-lg"
                  onClick={() => navigate('/')}
                  data-testid="button-new-user"
                >
                  Agende seu Power Talk gratuito
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}