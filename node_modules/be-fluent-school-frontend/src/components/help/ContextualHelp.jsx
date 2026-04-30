import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HelpBubble({ title, 
  content, 
  trigger, 
  position = 'top' 
 }) {
  const [isOpen, setIsOpen] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="help-trigger"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Help bubble */}
          <Card 
            className={`absolute z-50 w-72 shadow-lg animate-in slide-in-from-bottom-2 duration-200 ${getPositionClasses()}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs leading-relaxed">
                {content}
              </CardDescription>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Predefined help content for common UI elements
export const helpContent = {
  meetLinks: {
    title: "Links do Google Meet",
    content: "Crie e gerencie links para suas aulas online. Os links são gerados automaticamente e podem ser copiados para compartilhar com os alunos."
  },
  studentManagement: {
    title: "Gerenciamento de Alunos",
    content: "Adicione novos alunos, defina suas mensalidades e acompanhe o status de pagamento. Você pode editar informações e filtrar por diferentes critérios."
  },
  paymentStatus: {
    title: "Status de Pagamento",
    content: "Monitore o status das mensalidades dos alunos. Verde = Em dia, Amarelo = Próximo do vencimento, Vermelho = Em atraso."
  },
  classSchedule: {
    title: "Agenda de Aulas",
    content: "Visualize e gerencie sua agenda de aulas. Você pode criar novas aulas, remarcar existentes e ver o histórico de aulas ministradas."
  }
};