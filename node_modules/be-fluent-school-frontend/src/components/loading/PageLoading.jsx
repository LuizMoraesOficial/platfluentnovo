import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import beFluentLogo from '@/assets/be-fluent-logo-new.png';


export function PageLoading({ message = "Carregando...", fullScreen = true  }) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col items-center space-y-6 p-8 animate-fade-in">
          <div className="relative">
            <img
              src={beFluentLogo}
              alt="Be Fluent School Logo"
              className="logo-dark h-16 w-auto object-contain animate-pulse"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg animate-ping"></div>
          </div>
          
          <div className="text-center space-y-3">
            <h3 className="text-lg font-semibold text-foreground">{message}</h3>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 animate-fade-in">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <img
            src={beFluentLogo}
            alt="Be Fluent School Logo"
            className="logo-dark h-12 w-auto object-contain animate-pulse"
          />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex items-center space-x-1">
            <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-1 w-1 bg-primary rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPageLoading() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-border/40 bg-background p-4">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content Skeleton */}
      <div className="flex-1">
        <div className="h-16 border-b border-border/40 bg-background/95 px-4 flex items-center">
          <Skeleton className="h-4 w-4 mr-4" />
          <Skeleton className="h-5 w-32" />
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-in fade-in-50 duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="animate-in fade-in-50 duration-500">
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="flex items-center space-x-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthPageLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2b2b2b' }}>
      <div className="h-16 border-b border-white/10 bg-black/20 px-4 flex items-center">
        <Skeleton className="h-8 w-32 bg-white/20" />
      </div>
      
      <div className="min-h-[calc(100vh-4rem)] flex relative">
        {/* Left Side Skeleton */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-2xl bg-white/20" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48 bg-white/20" />
                    <Skeleton className="h-4 w-32 bg-white/20" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Skeleton className="h-8 w-80 bg-white/20" />
                  <Skeleton className="h-6 w-96 bg-white/20" />
                  <Skeleton className="h-6 w-72 bg-white/20" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <Skeleton className="h-6 w-6 mb-2 bg-white/20" />
                    <Skeleton className="h-4 w-20 mb-1 bg-white/20" />
                    <Skeleton className="h-3 w-16 bg-white/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side Form Skeleton */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative z-10">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <Skeleton className="h-8 w-48 mx-auto mb-3 bg-white/20" />
              <Skeleton className="h-4 w-64 mx-auto bg-white/20" />
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full bg-white/20" />
                <Skeleton className="h-10 w-full bg-white/20" />
                <Skeleton className="h-10 w-full bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}