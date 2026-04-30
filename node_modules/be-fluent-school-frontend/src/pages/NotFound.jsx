import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, GraduationCap } from "lucide-react";
import { errorLogger } from "@/components/error";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Enhanced 404 error logging
    errorLogger.logUserError(
      "404 Error: User attempted to access non-existent route",
      {
        component: 'NotFound',
        action: 'page_not_found',
        route: location.pathname,
      },
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      }
    );
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md text-center shadow-xl border-0">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-full">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-primary">404</CardTitle>
          <CardDescription className="text-lg">
            Oops! Página não encontrada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            A página que você está procurando não existe ou foi movida.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" />
              Página Inicial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
