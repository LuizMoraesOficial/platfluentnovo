import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Users, BookOpen, Calendar, DollarSign, Target, Award, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardCardSkeleton, TableSkeleton } from '@/components/loading/DashboardSkeleton';

export function AdvancedReports({ userRole = 'admin'  }) {
  const [timeRange, setTimeRange] = useState('6months');
  
  // Real API queries to fetch actual data from the platform with error handling
  const { data: studentStats, isLoading: studentStatsLoading, error: studentStatsError, refetch: refetchStudentStats } = useQuery({
    queryKey: ['/students/stats'],
    enabled: userRole === 'admin',
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const { data: revenueData, isLoading: revenueLoading, error: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: ['/api/reports/revenue', timeRange],
    enabled: userRole === 'admin',
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const { data: studentProgressData, isLoading: progressLoading, error: progressError, refetch: refetchProgress } = useQuery({
    queryKey: ['/api/reports/student-progress', timeRange],
    enabled: userRole === 'admin',
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const { data: teacherPerformanceData, isLoading: teacherPerfLoading, error: teacherPerfError, refetch: refetchTeacherPerf } = useQuery({
    queryKey: ['/api/reports/teacher-performance'],
    enabled: userRole === 'admin',
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const { data: courseCompletionData, isLoading: courseCompletionLoading, error: courseCompletionError, refetch: refetchCourseCompletion } = useQuery({
    queryKey: ['/api/reports/course-completion'],
    enabled: userRole === 'admin',
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const { data: todayClasses, isLoading: todayClassesLoading, error: todayClassesError, refetch: refetchTodayClasses } = useQuery({
    queryKey: ['/api/classes/today'],
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const { data: teachers, isLoading: teachersLoading, error: teachersError, refetch: refetchTeachers } = useQuery({
    queryKey: ['/teachers'],
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  // Calculate real KPIs from actual data instead of using mock data
  const calculateKPIs = () => {
    // Default empty state values
    const defaultKPIs = [
      {
        title: 'Receita Mensal',
        value: 'R$ 0',
        change: '0%',
        trend: 'neutral',
        icon: DollarSign,
        color: 'text-gray-600'
      },
      {
        title: 'Alunos Ativos',
        value: '0',
        change: '0%',
        trend: 'neutral',
        icon: Users,
        color: 'text-gray-600'
      },
      {
        title: 'Taxa de Retenção',
        value: '0%',
        change: '0%',
        trend: 'neutral',
        icon: Target,
        color: 'text-gray-600'
      },
      {
        title: 'Satisfação Média',
        value: '0/5',
        change: '0',
        trend: 'neutral',
        icon: Award,
        color: 'text-gray-600'
      }
    ];

    // If we don't have real data yet, return default empty states
    if (!studentStats || !revenueData || !teacherPerformanceData || 
        !Array.isArray(revenueData) || revenueData.length === 0) {
      return defaultKPIs;
    }
    
    const currentMonth = revenueData[revenueData.length - 1];
    const previousMonth = revenueData[revenueData.length - 2];
    
    const revenueChange = previousMonth ? 
      (((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100).toFixed(1) : '0';
    
    const retentionChange = previousMonth ?
      ((currentMonth.retention - previousMonth.retention)).toFixed(1) : '0';
    
    const avgRating = Array.isArray(teacherPerformanceData) && teacherPerformanceData.length > 0 ?
      (teacherPerformanceData.reduce((sum, teacher) => sum + (teacher.rating || 0), 0) / teacherPerformanceData.length).toFixed(1) : '0';
    
    return [
      {
        title: 'Receita Mensal',
        value: `R$ ${(currentMonth?.revenue || 0).toLocaleString('pt-BR')}`,
        change: `${revenueChange}%`,
        trend: Number(revenueChange) >= 0 ? 'up' : 'down',
        icon: DollarSign,
        color: Number(revenueChange) >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        title: 'Alunos Ativos',
        value: String(studentStats?.active || 0),
        change: '0%', // Could calculate based on historical data when available
        trend: 'neutral',
        icon: Users,
        color: 'text-blue-600'
      },
      {
        title: 'Taxa de Retenção',
        value: `${currentMonth?.retention || 0}%`,
        change: `${retentionChange}%`,
        trend: Number(retentionChange) >= 0 ? 'up' : 'down',
        icon: Target,
        color: Number(retentionChange) >= 0 ? 'text-purple-600' : 'text-red-600'
      },
      {
        title: 'Satisfação Média',
        value: `${avgRating}/5`,
        change: '0', // Could calculate based on historical ratings when available
        trend: 'neutral',
        icon: Award,
        color: 'text-yellow-600'
      }
    ];
  };
  
  const kpiCards = calculateKPIs();
  
  // Export functionality for reports
  const handleExportData = (format) => {
    try {
      // Prepare data for export
      const exportData = {
        timestamp: new Date().toISOString(),
        timeRange,
        kpis: kpiCards,
        studentStats,
        revenueData,
        teacherPerformanceData,
        courseCompletionData
      };

      if (format === 'csv') {
        // Export as CSV
        const csvContent = generateCSV(exportData);
        downloadFile(csvContent, `relatorio-${timeRange}-${Date.now()}.csv`, 'text/csv');
      } else if (format === 'excel') {
        // Export as Excel - simplified JSON for now
        const jsonContent = JSON.stringify(exportData, null, 2);
        downloadFile(jsonContent, `relatorio-${timeRange}-${Date.now()}.json`, 'application/json');
      } else if (format === 'pdf') {
        // Export as PDF - simplified approach
        const htmlContent = generateHTMLReport(exportData);
        // For now, open in new window for printing/saving as PDF
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
          newWindow.print();
        }
      }

      toast({
        title: "Relatório exportado!",
        description: `Relatório em formato ${format.toUpperCase()} foi gerado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Houve um problema ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Helper function to generate CSV content
  const generateCSV = (data) => {
    const rows = [
      ['Métrica', 'Valor', 'Mudança', 'Tendência'],
      ...data.kpis.map((kpi) => [kpi.title, kpi.value, kpi.change, kpi.trend])
    ];
    return rows.map(row => row.join(',')).join('\n');
  };

  // Helper function to generate HTML report
  const generateHTMLReport = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Avançado - Be Fluent School</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .kpi-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .timestamp { color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório Avançado - Be Fluent School</h1>
          <p class="timestamp">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          <p>Período: ${data.timeRange}</p>
        </div>
        <div class="kpi-grid">
          ${data.kpis.map((kpi) => `
            <div class="kpi-card">
              <h3>${kpi.title}</h3>
              <p><strong>Valor:</strong> ${kpi.value}</p>
              <p><strong>Mudança:</strong> ${kpi.change}</p>
              <p><strong>Tendência:</strong> ${kpi.trend}</p>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
  };

  // Helper function to download file
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const isLoading = studentStatsLoading || revenueLoading || progressLoading || 
                    teacherPerfLoading || courseCompletionLoading || todayClassesLoading || teachersLoading;
  
  const hasError = studentStatsError || revenueError || progressError || 
                   teacherPerfError || courseCompletionError || todayClassesError || teachersError;
  
  // Empty state component for when no data is available
  const EmptyState = ({ title, description  }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
  
  // Error state component for API failures
  const ErrorState = ({ title, description, onRetry }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          data-testid="button-retry-error"
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
        >
          Tentar Novamente
        </Button>
      )}
    </div>
  );
  
  // Global error handler function
  const handleGlobalRetry = () => {
    if (studentStatsError) refetchStudentStats();
    if (revenueError) refetchRevenue();
    if (progressError) refetchProgress();
    if (teacherPerfError) refetchTeacherPerf();
    if (courseCompletionError) refetchCourseCompletion();
    if (todayClassesError) refetchTodayClasses();
    if (teachersError) refetchTeachers();
  };
  
  // Global error state for critical failures
  if (hasError && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Relatórios Avançados</h2>
        </div>
        <Card data-testid="card-global-error">
          <CardContent className="pt-6">
            <ErrorState
              title="Erro ao Carregar Relatórios"
              description="Houve um problema ao conectar com o servidor. Verifique sua conexão de internet e tente novamente."
              onRetry={handleGlobalRetry}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Relatórios Avançados</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Relatórios Avançados</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange} data-testid="select-time-range">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Último mês</SelectItem>
              <SelectItem value="3months">3 meses</SelectItem>
              <SelectItem value="6months">6 meses</SelectItem>
              <SelectItem value="1year">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            data-testid="button-export-pdf" 
            disabled={isLoading}
            onClick={() => handleExportData('pdf')}
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="animate-in fade-in-50 slide-in-from-bottom-2" style={{ animationDelay: `${index * 100}ms` }} data-testid={`card-${kpi.title.toLowerCase().replace(/\s+/g, '-').replace(/ç/g, 'c').replace(/ã/g, 'a')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {kpi.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : kpi.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                ) : null}
                <span className={kpi.trend === 'up' ? 'text-green-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-gray-500'}>
                  {kpi.change} vs. mês anterior
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Financeiro</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="teachers">Professores</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-revenue-evolution">
              <CardHeader>
                <CardTitle>Evolução da Receita</CardTitle>
                <CardDescription>Receita mensal no período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueError ? (
                  <ErrorState 
                    title="Erro ao carregar receita" 
                    description="Não foi possível carregar os dados de receita. Tente novamente."
                    onRetry={refetchRevenue}
                  />
                ) : revenueData && Array.isArray(revenueData) && revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="Nenhum dado de receita" 
                    description="Dados de receita aparecerão aqui quando houver transações registradas e pagamentos de alunos." 
                  />
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-student-growth">
              <CardHeader>
                <CardTitle>Crescimento de Alunos</CardTitle>
                <CardDescription>Número de alunos ativos por mês</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueError ? (
                  <ErrorState 
                    title="Erro ao carregar crescimento" 
                    description="Não foi possível carregar os dados de crescimento de alunos. Tente novamente."
                    onRetry={refetchRevenue}
                  />
                ) : revenueData && Array.isArray(revenueData) && revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Line 
                        type="monotone" 
                        dataKey="students" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="Nenhum dado de alunos" 
                    description="O gráfico de crescimento aparecerá quando alunos se cadastrarem na plataforma." 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-student-progress">
              <CardHeader>
                <CardTitle>Progresso por Nível</CardTitle>
                <CardDescription>Distribuição de alunos por nível de proficiência</CardDescription>
              </CardHeader>
              <CardContent>
                {progressError ? (
                  <ErrorState 
                    title="Erro ao carregar progresso" 
                    description="Não foi possível carregar os dados de progresso dos alunos. Tente novamente."
                    onRetry={refetchProgress}
                  />
                ) : studentProgressData && Array.isArray(studentProgressData) && studentProgressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={studentProgressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Bar dataKey="beginners" stackId="a" fill="#10B981" />
                      <Bar dataKey="intermediate" stackId="a" fill="#F59E0B" />
                      <Bar dataKey="advanced" stackId="a" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="Nenhum dado de progresso" 
                    description="Dados de progresso dos alunos aparecerão aqui conforme avançam nos níveis de inglês." 
                  />
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-retention-rate">
              <CardHeader>
                <CardTitle>Taxa de Retenção</CardTitle>
                <CardDescription>Porcentagem de alunos que continuam os estudos</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueError ? (
                  <ErrorState 
                    title="Erro ao carregar retenção" 
                    description="Não foi possível carregar os dados de retenção. Tente novamente."
                    onRetry={refetchRevenue}
                  />
                ) : revenueData && Array.isArray(revenueData) && revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Line 
                        type="monotone" 
                        dataKey="retention" 
                        stroke="#8B5CF6" 
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="Nenhum dado de retenção" 
                    description="Dados de retenção aparecerão quando houver histórico de alunos e suas atividades." 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-course-completion">
              <CardHeader>
                <CardTitle>Conclusão de Cursos</CardTitle>
                <CardDescription>Taxa de conclusão por tipo de curso</CardDescription>
              </CardHeader>
              <CardContent>
                {courseCompletionError ? (
                  <ErrorState 
                    title="Erro ao carregar conclusão" 
                    description="Não foi possível carregar os dados de conclusão de cursos. Tente novamente."
                    onRetry={refetchCourseCompletion}
                  />
                ) : courseCompletionData && Array.isArray(courseCompletionData) && courseCompletionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={courseCompletionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {courseCompletionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    title="Nenhum curso concluído" 
                    description="Dados de conclusão de cursos aparecerão quando alunos completarem os módulos de ensino." 
                  />
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-popular-courses">
              <CardHeader>
                <CardTitle>Cursos Mais Populares</CardTitle>
                <CardDescription>Ranking dos cursos mais procurados</CardDescription>
              </CardHeader>
              <CardContent>
                {courseCompletionError ? (
                  <ErrorState 
                    title="Erro ao carregar ranking" 
                    description="Não foi possível carregar o ranking de cursos. Tente novamente."
                    onRetry={refetchCourseCompletion}
                  />
                ) : courseCompletionData && Array.isArray(courseCompletionData) && courseCompletionData.length > 0 ? (
                  <div className="space-y-4">
                    {courseCompletionData.map((course, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: course.color }}
                          ></div>
                          <span className="font-medium">{course.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={course.value} className="w-20" />
                          <span className="text-sm text-muted-foreground">{course.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    title="Nenhum curso disponível" 
                    description="Rankings de cursos aparecerão quando houver atividade estudantil na plataforma." 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card data-testid="card-teacher-performance">
            <CardHeader>
              <CardTitle>Performance dos Professores</CardTitle>
              <CardDescription>Avaliações e estatísticas dos professores</CardDescription>
            </CardHeader>
            <CardContent>
              {teacherPerfError ? (
                <ErrorState 
                  title="Erro ao carregar performance" 
                  description="Não foi possível carregar as estatísticas dos professores. Tente novamente."
                  onRetry={refetchTeacherPerf}
                />
              ) : teacherPerformanceData && Array.isArray(teacherPerformanceData) && teacherPerformanceData.length > 0 ? (
                <div className="space-y-4">
                  {teacherPerformanceData.map((teacher, index) => (
                    <div key={index} className="p-4 border rounded-lg" data-testid={`teacher-${index}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{teacher.name || teacher.full_name}</h4>
                        <Badge variant="secondary">
                          ⭐ {teacher.rating || '0.0'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Alunos</p>
                          <p className="font-semibold">{teacher.students || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Taxa Conclusão</p>
                          <p className="font-semibold">{teacher.completion || 0}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Horas/Mês</p>
                          <p className="font-semibold">{teacher.hours || 0}h</p>
                        </div>
                      </div>
                      <Progress value={teacher.completion || 0} className="mt-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  title="Nenhum professor cadastrado" 
                  description="Estatísticas de performance aparecerão quando professores se cadastrarem na plataforma." 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}