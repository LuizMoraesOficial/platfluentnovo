import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export function MobileOptimizations() {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar se está em modo standalone (PWA)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                            (window.navigator).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Escutar evento de instalação PWA
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch((error) => {
          console.log('Erro ao registrar Service Worker:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      toast({
        title: "App instalado!",
        description: "Be Fluent School foi adicionado à sua tela inicial.",
      });
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // Não mostrar se já foi dispensado ou se já está instalado
  if (isStandalone || localStorage.getItem('installPromptDismissed')) {
    return null;
  }

  return (
    <>
      {/* Banner de Instalação PWA */}
      {showInstallPrompt && (
        <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-2xl border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 md:max-w-md md:left-auto md:right-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">
                  Instalar Be Fluent School
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Acesse rapidamente suas aulas e progresso direto da tela inicial
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleInstallApp}
                    className="h-8 text-xs transition-all hover:scale-105"
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Instalar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={dismissInstallPrompt}
                    className="h-8 text-xs"
                  >
                    Agora não
                  </Button>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={dismissInstallPrompt}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Otimizações mobile via CSS estático */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-optimized { padding: 0.5rem !important; }
          .mobile-text { font-size: 0.875rem !important; }
          .mobile-button { height: 2.5rem !important; font-size: 0.875rem !important; }
          .mobile-card { margin: 0.5rem !important; border-radius: 0.75rem !important; }
          input[type="text"],
          input[type="email"],
          input[type="password"],
          input[type="number"],
          textarea,
          select { font-size: 16px !important; }
        }
        button, a, [role="button"] {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        @supports (padding: max(0px)) {
          .safe-area-inset {
            padding-left: max(1rem, env(safe-area-inset-left));
            padding-right: max(1rem, env(safe-area-inset-right));
            padding-top: max(1rem, env(safe-area-inset-top));
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </>
  );
}

// Hook para detectar orientação
export const useOrientation = () => {
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return orientation;
};