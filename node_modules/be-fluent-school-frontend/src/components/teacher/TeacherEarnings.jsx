import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Label 
} from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  BarChart3,
  PieChart,
  FileText,
  CreditCard,
  Banknote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const mockEarnings = [];

const mockPayments = [];

const mockStats = {
  currentMonth: {
    total: 0,
    classes: 0,
    hoursWorked: 0,
    avgPerHour: 0
  },
  lastMonth: {
    total: 0,
    classes: 0
  },
  nextPayment: {
    amount: 0,
    date: '',
    status: 'Pendente'
  },
  yearToDate: {
    total: 0,
    classes: 0,
    months: 0
  }
};

export default function TeacherEarnings({ teacherName = '', teacherId = null }) {
  const { toast } = useToast();
  const [earnings, setEarnings] = useState(mockEarnings);
  const [payments, setPayments] = useState(mockPayments);
  const [stats, setStats] = useState(mockStats);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState('2025-01');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEarnings = earnings.filter(earning => {
    const matchesSearch = earning.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         earning.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || earning.status === statusFilter;
    const matchesMonth = earning.date.startsWith(selectedMonth);
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="text-green-600">Concluída</Badge>;
      case 'no_show_student':
        return <Badge variant="outline" className="text-orange-600">Falta do Aluno</Badge>;
      case 'no_show_teacher':
        return <Badge variant="destructive">Falta do Professor</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600">Cancelada</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="secondary" className="text-green-600">Pago</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-orange-600">Pendente</Badge>;
      case 'disputed':
        return <Badge variant="destructive">Disputado</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const handleExportData = (format) => {
    toast({
      title: 'Exportando dados...',
      description: `Arquivo ${format.toUpperCase()} sendo gerado.`,
    });
    
    // Simular download
    setTimeout(() => {
      toast({
        title: 'Download concluído!',
        description: `Relatório de ganhos exportado em ${format.toUpperCase()}.`,
      });
    }, 2000);
  };

  const calculateGrowth = () => {
    const growth = ((stats.currentMonth.total - stats.lastMonth.total) / stats.lastMonth.total) * 100;
    return growth;
  };

  const totalEarningsMonth = filteredEarnings.reduce((sum, earning) => sum + earning.totalValue, 0);
  const paidEarnings = filteredEarnings.filter(e => e.paymentStatus === 'paid').reduce((sum, earning) => sum + earning.totalValue, 0);
  const pendingEarnings = filteredEarnings.filter(e => e.paymentStatus === 'pending').reduce((sum, earning) => sum + earning.totalValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Valores a Receber</h2>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-export-earnings">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Exportar Relatório</DialogTitle>
                <DialogDescription>
                  Escolha o formato para exportar seus dados financeiros.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Button 
                  onClick={() => handleExportData('pdf')} 
                  className="w-full" 
                  variant="outline"
                  data-testid="button-export-pdf"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar como PDF
                </Button>
                <Button 
                  onClick={() => handleExportData('excel')} 
                  className="w-full" 
                  variant="outline"
                  data-testid="button-export-excel"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Exportar como Excel
                </Button>
                <Button 
                  onClick={() => handleExportData('csv')} 
                  className="w-full" 
                  variant="outline"
                  data-testid="button-export-csv"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar como CSV
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="earnings">Detalhamento</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Total Este Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {stats.currentMonth.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{stats.currentMonth.classes} aulas ministradas</p>
                <div className="flex items-center mt-2">
                  {calculateGrowth() > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={`text-xs ${calculateGrowth() > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(calculateGrowth()).toFixed(1)}% vs mês anterior
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Próximo Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">R$ {stats.nextPayment.amount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{stats.nextPayment.date}</p>
                <Badge variant="outline" className="mt-2 text-xs">{stats.nextPayment.status}</Badge>
              </CardContent>
            </Card>

            <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  Taxa por Hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {stats.currentMonth.avgPerHour}</div>
                <p className="text-xs text-muted-foreground">{stats.currentMonth.hoursWorked}h trabalhadas</p>
              </CardContent>
            </Card>

            <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  Ano até Agora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {stats.yearToDate.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{stats.yearToDate.classes} aulas em {stats.yearToDate.months} mês(es)</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Mês Atual</CardTitle>
                <CardDescription>Janeiro 2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Valor Bruto:</span>
                    <span className="text-sm font-medium">R$ {totalEarningsMonth.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Valores Pagos:</span>
                    <span className="text-sm font-medium text-green-600">R$ {paidEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pendentes:</span>
                    <span className="text-sm font-medium text-orange-600">R$ {pendingEarnings.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Total a Receber:</span>
                      <span className="text-green-600">R$ {pendingEarnings.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
                <CardDescription>Datas importantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pagamento Janeiro</p>
                      <p className="text-xs text-muted-foreground">05/02/2025 - R$ 3.230</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Declaração IR</p>
                      <p className="text-xs text-muted-foreground">Disponível em 31/01/2025</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reajuste de Valores</p>
                      <p className="text-xs text-muted-foreground">Revisão em 01/03/2025</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-40"
                    data-testid="input-month-filter"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="no_show_student">Falta do Aluno</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                    data-testid="input-search-student"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento das Aulas</CardTitle>
              <CardDescription>
                {filteredEarnings.length} aulas encontradas para {new Date(selectedMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Aluno/Turma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEarnings.map((earning) => (
                    <TableRow key={earning.id} className="hover:bg-muted/50">
                      <TableCell>{new Date(earning.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{earning.studentName}</div>
                          {earning.studentCount && (
                            <div className="text-xs text-muted-foreground">{earning.studentCount} alunos</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={earning.classType === 'individual' ? 'text-blue-600' : 'text-purple-600'}>
                          {earning.classType === 'individual' ? 'Individual' : 'Grupo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{earning.duration}min</TableCell>
                      <TableCell>{getStatusBadge(earning.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(earning.paymentStatus)}</TableCell>
                      <TableCell className="text-right font-medium">R$ {earning.totalValue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredEarnings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma aula encontrada com os filtros aplicados.
                </div>
              )}
              
              {filteredEarnings.length > 0 && (
                <div className="mt-4 p-4 border-t bg-muted/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total do período:</span>
                    <span className="text-lg font-bold text-green-600">
                      R$ {totalEarningsMonth.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
              <CardDescription>Últimos pagamentos recebidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        payment.status === 'paid' ? 'bg-green-100 dark:bg-green-900' : 
                        payment.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900' :
                        'bg-blue-100 dark:bg-blue-900'
                      }`}>
                        {payment.status === 'paid' ? (
                          <CheckCircle className={`h-4 w-4 text-green-600 dark:text-green-400`} />
                        ) : payment.status === 'pending' ? (
                          <Clock className={`h-4 w-4 text-orange-600 dark:text-orange-400`} />
                        ) : (
                          <CreditCard className={`h-4 w-4 text-blue-600 dark:text-blue-400`} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{payment.month}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.classesCount} aulas • 
                          {payment.status === 'paid' ? ` Pago em ${new Date(payment.paidDate).toLocaleDateString('pt-BR')}` : ' Processando'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Via {payment.paymentMethod.toUpperCase()} • Líquido: R$ {payment.netAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-green-600">R$ {payment.totalAmount.toLocaleString()}</span>
                      {payment.deductions > 0 && (
                        <p className="text-xs text-muted-foreground">-R$ {payment.deductions} (taxas)</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição por Tipo de Aula
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Aulas Individuais</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">75%</div>
                      <div className="text-xs text-muted-foreground">30 aulas</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Aulas em Grupo</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">25%</div>
                      <div className="text-xs text-muted-foreground">10 aulas</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Performance vs Meta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">113%</div>
                    <p className="text-sm text-muted-foreground">da meta mensal</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Meta: R$ 3.000</span>
                      <span>Atual: R$ 3.400</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Análise de Tendências</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">R$ 18.500</p>
                  <p className="text-sm text-muted-foreground">Média mensal dos últimos 6 meses</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">236</div>
                    <div className="text-sm text-muted-foreground">Aulas totais</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">R$ 78</div>
                    <div className="text-sm text-muted-foreground">Valor médio/aula</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">95%</div>
                    <div className="text-sm text-muted-foreground">Taxa de conclusão</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { TeacherEarnings };