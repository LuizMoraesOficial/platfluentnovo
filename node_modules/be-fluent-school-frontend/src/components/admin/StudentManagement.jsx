import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard,
  FileText,
  Eye,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Create student form schema
const createStudentFormSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Formato de email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 caracteres"),
  cpf: z.string().min(11, "CPF deve ter pelo menos 11 caracteres").max(14, "CPF inválido"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  address: z.string().min(1, "Endereço é obrigatório"),
  student_level: z.enum(['beginner', 'elementary', 'pre_intermediate', 'intermediate', 'upper_intermediate', 'advanced', 'proficiency']).optional(),
  current_module: z.string().optional(),
  monthly_fee: z.coerce.number().positive("Valor da mensalidade deve ser positivo"),
  payment_due_date: z.coerce.number().min(1, "Dia deve ser entre 1 e 31").max(31, "Dia deve ser entre 1 e 31"),
  is_active: z.boolean().default(true)
});



const moduleOptionsByLevel = {
  beginner: [
    { value: 'S1', label: 'Start 1' },
    { value: 'S2', label: 'Start 2' },
    { value: 'S3', label: 'Start 3' },
  ],
  elementary: [
    { value: 'S1', label: 'Start 1' },
    { value: 'S2', label: 'Start 2' },
    { value: 'S3', label: 'Start 3' },
  ],
  pre_intermediate: [
    { value: 'S1', label: 'Start 1' },
    { value: 'S2', label: 'Start 2' },
    { value: 'S3', label: 'Start 3' },
  ],
  intermediate: [
    { value: 'I1', label: 'Intermediate 1' },
    { value: 'I2', label: 'Intermediate 2' },
    { value: 'I3', label: 'Intermediate 3' },
  ],
  upper_intermediate: [
    { value: 'I1', label: 'Intermediate 1' },
    { value: 'I2', label: 'Intermediate 2' },
    { value: 'I3', label: 'Intermediate 3' },
  ],
  advanced: [
    { value: 'AD1', label: 'Advanced 1' },
    { value: 'AD2', label: 'Advanced 2' },
    { value: 'AD3', label: 'Advanced 3' },
    { value: 'AD4', label: 'Advanced 4' },
  ],
  proficiency: [
    { value: 'AD1', label: 'Advanced 1' },
    { value: 'AD2', label: 'Advanced 2' },
    { value: 'AD3', label: 'Advanced 3' },
    { value: 'AD4', label: 'Advanced 4' },
  ],
};

function getModuleOptions(level) {
  return moduleOptionsByLevel[level] || moduleOptionsByLevel.beginner;
}

export function StudentManagement({ userRole = 'admin'  }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedEditStudentLevel, setSelectedEditStudentLevel] = useState('beginner');
  const [selectedEditModule, setSelectedEditModule] = useState('S1');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Create student form
  const createForm = useForm({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      cpf: '',
      birth_date: '',
      address: '',
      student_level: 'beginner',
      current_module: 'S1',
      monthly_fee: 0,
      payment_due_date: 5,
      is_active: true
    }
  });

  const selectedStudentLevel = createForm.watch('student_level');

  useEffect(() => {
    if (!selectedStudent) return;
    const level = selectedStudent.student_level || 'beginner';
    const moduleValue = selectedStudent.current_module || getModuleOptions(level)[0]?.value || 'S1';
    setSelectedEditStudentLevel(level);
    setSelectedEditModule(moduleValue);
  }, [selectedStudent]);

  // Fetch students data
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ['/students'],
    queryFn: () => apiRequest('/students'),
  });

  // Fetch student statistics
  const { data: studentStats } = useQuery({
    queryKey: ['/students/stats'],
    queryFn: () => apiRequest('/students/stats'),
  });

  // Filter students based on search and status
  const filteredStudents = allStudents.filter((student) => {
    const matchesSearch = searchTerm === '' || 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.cpf && student.cpf.includes(searchTerm.replace(/\D/g, '')));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && student.is_active) ||
      (statusFilter === 'inactive' && !student.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: (studentId) => apiRequest(`/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/students'] });
      queryClient.invalidateQueries({ queryKey: ['/students/stats'] });
      toast({
        title: "Aluno removido",
        description: "O aluno foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover aluno",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: (data) => {
      const requestData = {
        ...data,
        cpf: data.cpf.replace(/\D/g, ''), // Remove formatting for backend
        phone: data.phone.replace(/\D/g, ''), // Remove formatting for backend
        birth_date: data.birth_date,
        monthly_fee: Math.round(data.monthly_fee * 100), // Convert to cents
        role: 'student'
      };
      return apiRequest('/students', { 
        method: 'POST', 
        body: JSON.stringify(requestData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/students'] });
      queryClient.invalidateQueries({ queryKey: ['/students/stats'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Aluno criado",
        description: "O aluno foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar aluno",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update student mutation
  const updateStudentMutation = useMutation({ mutationFn: ({ id, data  }) => 
      apiRequest(`/students/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/students'] });
      queryClient.invalidateQueries({ queryKey: ['/students/stats'] });
      setIsEditDialogOpen(false);
      setSelectedStudent(null);
      toast({
        title: "Aluno atualizado",
        description: "As informações do aluno foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar aluno",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Utility functions
  const formatCPF = (cpf) => {
    if (!cpf) return 'N/A';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Input mask helper functions
  const applyCPFMask = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
    if (!match) return value;
    let formatted = match[1];
    if (match[2]) formatted += `.${match[2]}`;
    if (match[3]) formatted += `.${match[3]}`;
    if (match[4]) formatted += `-${match[4]}`;
    return formatted;
  };

  const applyPhoneMask = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (!cleaned) return '';
    
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = '(' + cleaned.slice(0, 2);
    }
    if (cleaned.length >= 2) {
      formatted += ') ';
    }
    if (cleaned.length > 2) {
      formatted += cleaned.slice(2, 7);
    }
    if (cleaned.length > 7) {
      formatted += '-' + cleaned.slice(7, 11);
    }
    return formatted;
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100); // Convert from cents
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500" : "bg-gray-500"}>
        {isActive ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            Ativo
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1" />
            Inativo
          </>
        )}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      paid: { label: 'Pago', variant: 'default', color: 'bg-green-500' },
      pending: { label: 'Pendente', variant: 'secondary', color: 'bg-yellow-500' },
      overdue: { label: 'Em atraso', variant: 'destructive', color: 'bg-red-500' }
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setIsViewDialogOpen(true);
  };

  const handleDeleteStudent = (studentId) => {
    deleteStudentMutation.mutate(studentId);
  };

  // Form submission handlers
  const handleCreateStudent = (data) => {
    createStudentMutation.mutate(data);
  };

  const handleUpdateStudent = (formData) => {
    if (!selectedStudent) return;

    // Get student level and validate it's a valid enum value
    const studentLevelValue = formData.get('student_level');
    const validStudentLevels = ['beginner', 'elementary', 'pre_intermediate', 'intermediate', 'upper_intermediate', 'advanced', 'proficiency'];
    const student_level = validStudentLevels.includes(studentLevelValue) 
      ? studentLevelValue
      : null;

    const rawMonthlyFee = parseFloat(formData.get('monthly_fee')) || 0;
    const data = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      cpf: formData.get('cpf'),
      address: formData.get('address'),
      student_level,
      current_module: formData.get('current_module') || null,
      monthly_fee: Math.round(rawMonthlyFee * 100), // Convert to cents
      payment_due_date: parseInt(formData.get('payment_due_date')),
      is_active: formData.get('is_active') === 'true',
    };

    updateStudentMutation.mutate({ id: selectedStudent.id, data });
  };

  // Dialog control handlers
  const openCreateDialog = () => {
    createForm.reset();
    setIsCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestão de Alunos
        </h2>
        <Button 
          className="transition-all hover:scale-105"
          onClick={openCreateDialog}
          data-testid="button-create-student"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Aluno
        </Button>
      </div>

      {/* Statistics Cards */}
      {studentStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-students">{studentStats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-active-students">{studentStats.active}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alunos Inativos</CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600" data-testid="text-inactive-students">{studentStats.inactive}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos em Atraso</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-payments">{studentStats.overdue_payments}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar aluno</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, email ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-students"
                />
              </div>
            </div>
            
            <div className="w-full sm:w-48">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Lista de Alunos ({filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">CPF</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                  <TableHead className="hidden xl:table-cell">Nível</TableHead>
                  <TableHead className="hidden xl:table-cell">Mensalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map((student) => (
                  <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold" data-testid={`text-student-name-${student.id}`}>
                          {student.full_name}
                        </div>
                        <div className="text-sm text-muted-foreground md:hidden">
                          {student.email}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden md:table-cell" data-testid={`text-student-cpf-${student.id}`}>
                      {formatCPF(student.cpf)}
                    </TableCell>
                    
                    <TableCell className="hidden lg:table-cell" data-testid={`text-student-email-${student.id}`}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {student.email}
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden lg:table-cell" data-testid={`text-student-phone-${student.id}`}>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {student.phone || 'N/A'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden xl:table-cell" data-testid={`text-student-level-${student.id}`}>
                      <Badge variant="outline">
                        {student.student_level || 'N/A'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="hidden xl:table-cell" data-testid={`text-student-fee-${student.id}`}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        {formatCurrency(student.monthly_fee)}
                      </div>
                    </TableCell>
                    
                    <TableCell data-testid={`status-student-${student.id}`}>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(student.is_active)}
                        <div className="lg:hidden">
                          {getPaymentStatusBadge(student.current_payment_status)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewStudent(student)}
                          data-testid={`button-view-student-${student.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditStudent(student)}
                          data-testid={`button-edit-student-${student.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-delete-student-${student.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o aluno <strong>{student.full_name}</strong>? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteStudent(student.id)}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid={`button-confirm-delete-student-${student.id}`}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {paginatedStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Nenhum aluno encontrado com os filtros aplicados.' 
                        : 'Nenhum aluno cadastrado.'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredStudents.length} alunos)
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Student Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Aluno</DialogTitle>
            <DialogDescription>
              Preencha as informações para cadastrar um novo aluno no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateStudent)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <FormField
                  control={createForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Digite o nome completo"
                          data-testid="input-create-student-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Email */}
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="exemplo@email.com"
                          data-testid="input-create-student-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* CPF */}
                <FormField
                  control={createForm.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          onChange={(e) => {
                            const masked = applyCPFMask(e.target.value);
                            field.onChange(masked);
                          }}
                          data-testid="input-create-student-cpf"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Telefone */}
                <FormField
                  control={createForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="(11) 99999-9999"
                          maxLength={15}
                          onChange={(e) => {
                            const masked = applyPhoneMask(e.target.value);
                            field.onChange(masked);
                          }}
                          data-testid="input-create-student-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Data de Nascimento */}
                <FormField
                  control={createForm.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-create-student-birth-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Nível do Estudante */}
                <FormField
                  control={createForm.control}
                  name="student_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível do Estudante</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-student-level">
                            <SelectValue placeholder="Selecione o nível" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="elementary">Elementary</SelectItem>
                          <SelectItem value="pre_intermediate">Pre-Intermediate</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="upper_intermediate">Upper-Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="proficiency">Proficiency</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="current_module"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Módulo Inicial</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-student-module">
                            <SelectValue placeholder="Selecione o módulo inicial" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getModuleOptions(selectedStudentLevel).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Valor da Mensalidade */}
                <FormField
                  control={createForm.control}
                  name="monthly_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor da Mensalidade (R$) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-create-student-monthly-fee"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Data de Vencimento */}
                <FormField
                  control={createForm.control}
                  name="payment_due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia do Vencimento *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="31"
                          placeholder="5"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-create-student-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Endereço - Full width */}
              <FormField
                control={createForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço Completo *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Digite o endereço completo do aluno"
                        className="min-h-[60px]"
                        data-testid="input-create-student-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Status */}
              <FormField
                control={createForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'true')} defaultValue={field.value ? 'true' : 'false'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-create-student-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Ativo</SelectItem>
                        <SelectItem value="false">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create-student"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createStudentMutation.isPending}
                  data-testid="button-submit-create-student"
                >
                  {createStudentMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar Aluno
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Student Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Aluno</DialogTitle>
            <DialogDescription>
              Informações completas do aluno selecionado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome Completo</Label>
                  <p className="text-sm font-medium" data-testid="view-student-name">{selectedStudent.full_name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedStudent.is_active)}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm" data-testid="view-student-email">{selectedStudent.email}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                  <p className="text-sm" data-testid="view-student-phone">{selectedStudent.phone || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
                  <p className="text-sm" data-testid="view-student-cpf">{formatCPF(selectedStudent.cpf)}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nível de Inglês</Label>
                  <p className="text-sm" data-testid="view-student-level">{selectedStudent.student_level || 'N/A'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Módulo Inicial</Label>
                  <p className="text-sm" data-testid="view-student-current-module">{selectedStudent.current_module || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Mensalidade</Label>
                  <p className="text-sm font-medium" data-testid="view-student-monthly-fee">
                    {formatCurrency(selectedStudent.monthly_fee)}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Vencimento</Label>
                  <p className="text-sm" data-testid="view-student-due-date">
                    Dia {selectedStudent.payment_due_date || 'N/A'} de cada mês
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status do Pagamento</Label>
                  <div className="mt-1">
                    {getPaymentStatusBadge(selectedStudent.current_payment_status)}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Cadastro</Label>
                  <p className="text-sm" data-testid="view-student-created-at">
                    {formatDate(selectedStudent.created_at)}
                  </p>
                </div>
              </div>
              
              {selectedStudent.address && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
                  <p className="text-sm" data-testid="view-student-address">{selectedStudent.address}</p>
                </div>
              )}
              
              {selectedStudent.birth_date && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
                  <p className="text-sm" data-testid="view-student-birth-date">
                    {formatDate(selectedStudent.birth_date)}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias nas informações do aluno.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleUpdateStudent(formData);
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={selectedStudent.full_name}
                      required
                      data-testid="input-edit-student-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={selectedStudent.email}
                      required
                      data-testid="input-edit-student-email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={selectedStudent.phone || ''}
                      data-testid="input-edit-student-phone"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      defaultValue={selectedStudent.cpf || ''}
                      data-testid="input-edit-student-cpf"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="student_level">Nível de Inglês</Label>
                    <Select
                      name="student_level"
                      value={selectedEditStudentLevel}
                      onValueChange={(value) => {
                        setSelectedEditStudentLevel(value);
                        const options = getModuleOptions(value);
                        if (!options.some((option) => option.value === selectedEditModule)) {
                          setSelectedEditModule(options[0]?.value || '');
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-edit-student-level">
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="elementary">Elementary</SelectItem>
                        <SelectItem value="pre_intermediate">Pre-Intermediate</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="upper_intermediate">Upper-Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="proficiency">Proficiency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="current_module">Módulo Inicial</Label>
                    <Select
                      name="current_module"
                      value={selectedEditModule}
                      onValueChange={setSelectedEditModule}
                    >
                      <SelectTrigger data-testid="select-edit-student-current-module">
                        <SelectValue placeholder="Selecione o módulo inicial" />
                      </SelectTrigger>
                      <SelectContent>
                        {getModuleOptions(selectedEditStudentLevel).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="monthly_fee">Mensalidade (R$)</Label>
                    <Input
                      id="monthly_fee"
                      name="monthly_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={selectedStudent.monthly_fee ? (selectedStudent.monthly_fee / 100) : ''}
                      data-testid="input-edit-student-fee"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="payment_due_date">Dia de Vencimento</Label>
                    <Select name="payment_due_date" defaultValue={selectedStudent.payment_due_date?.toString() || ''}>
                      <SelectTrigger data-testid="select-edit-student-due-date">
                        <SelectValue placeholder="Dia do mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="is_active">Status</Label>
                    <Select name="is_active" defaultValue={selectedStudent.is_active ? 'true' : 'false'}>
                      <SelectTrigger data-testid="select-edit-student-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Ativo</SelectItem>
                        <SelectItem value="false">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={selectedStudent.address || ''}
                    rows={3}
                    data-testid="textarea-edit-student-address"
                  />
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateStudentMutation.isPending}
                  data-testid="button-save-student-changes"
                >
                  {updateStudentMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}