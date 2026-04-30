
import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { PageLoading, DashboardPageLoading, AuthPageLoading } from "@/components/loading/PageLoading";
import { cacheStrategies } from "@/lib/cacheStrategies";
import { performanceMonitor } from "@/lib/performance";
import { serviceWorkerManager } from "@/lib/serviceWorker";
import { cssOptimization } from "@/lib/cssOptimization";

import { errorLogger } from "@/components/error";
import { useAuthLogger } from "@/hooks/useAuthLogger";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { queryClient } from '@/lib/queryClient';

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Nivelamento = lazy(() => import("./pages/Nivelamento"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => {
  useEffect(() => {
    const initializeErrorLogging = () => {
      try {
        errorLogger.logSystemError(
          'Application initialized with enhanced error handling',
          undefined,
          {
            component: 'App',
            action: 'app_init',
          },
          {
            environment: import.meta.env.MODE,
            buildVersion: import.meta.env.VITE_APP_VERSION || 'development',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error('Failed to initialize error logging:', error);
      }
    };

    const preloadPages = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          import("./pages/Dashboard");
          import("./pages/Auth");
        });
      } else {
        setTimeout(() => {
          import("./pages/Dashboard");
          import("./pages/Auth");
        }, 2000);
      }
    };

    const cachedTheme = cacheStrategies.getCachedTheme();
    if (cachedTheme) {
      document.documentElement.classList.toggle('dark', cachedTheme === 'dark');
    }

    if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        serviceWorkerManager.register();
      });
    }

    initializeErrorLogging();
    preloadPages();
    cssOptimization.startTracking();
    performanceMonitor.trackNavigation('app-init');
  }, []);

  useAuthLogger();

  return (
  
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="be-fluent-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Suspense fallback={
                    <div className="min-h-screen bg-[#050506]" />
                  }>
                    <Index />
                  </Suspense>
                }
              />
              <Route 
                path="/auth" 
                element={
                  <Suspense fallback={<AuthPageLoading />}>
                    <Auth />
                  </Suspense>
                } 
              />
              <Route
                path="/auth/change-password"
                element={
                  <Suspense fallback={<PageLoading message="Carregando alteração de senha..." />}>
                    <ProtectedRoute>
                      <ChangePassword />
                    </ProtectedRoute>
                  </Suspense>
                }
              />
              <Route 
                path="/nivelamento" 
                element={
                  <Suspense fallback={<PageLoading message="Carregando teste de nível..." />}>
                    <Nivelamento />
                  </Suspense>
                } 
              />
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<DashboardPageLoading />}>
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/admin/*"
                element={
                  <Suspense fallback={<DashboardPageLoading />}>
                    <ProtectedRoute roles={['admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/teacher/*"
                element={
                  <Suspense fallback={<DashboardPageLoading />}>
                    <ProtectedRoute roles={['teacher', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/student/*"
                element={
                  <Suspense fallback={<DashboardPageLoading />}>
                    <ProtectedRoute roles={['student', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route 
                path="*" 
                element={
                  <Suspense fallback={<PageLoading message="Página não encontrada..." />}>
                    <NotFound />
                  </Suspense>
                } 
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  
  );
};

export default App;
