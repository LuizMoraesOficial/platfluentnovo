import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, Filter, AlertTriangle, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ── Modal de Redistribuição de Alunos ────────────────────────────────────────

function ReassignModal({ teacher, open, onClose, onConfirm, isLoading }) {
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/teachers', teacher?.id, 'students'],
    queryFn: () => apiRequest(`/teachers/${teacher.id}/students`),
    enabled: open && !!teacher?.id,
  });

  const { data: allTeachers = [] } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: () => apiRequest('/teachers'),
    enabled: open,
  });

  const otherTeachers = allTeachers.filter(t => t.id !== teacher?.id && t.is_active);

  const [assignments, setAssignments] = useState({});

  const allAssigned = students.length > 0 && students.every(s => assignments[s.id]);

  const handleConfirm = () => {
    const list = Object.entries(assignments).map(([studentId, newTeacherId]) => ({
      studentId,
      newTeacherId,
    }));
    onConfirm(list);
  };

  if (!teacher) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Redistribuir Alunos — {teacher.full_name}
          </DialogTitle>
          <DialogDescription>
            Este professor possui alunos ativos. Selecione um novo professor para cada aluno antes de continuar.
          </DialogDescription>
        </DialogHeader>

        {studentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum aluno vinculado encontrado. Pode prosseguir.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
              <Users className="h-4 w-4 shrink-0" />
              <span>{students.length} aluno(s) precisam ser redistribuídos</span>
            </div>

            <div className="space-y-3">
              {students.map((student) => (
                <div key={student.id} className="border border-border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                      {student.student_level && (
                        <p className="text-xs text-muted-foreground mt-0.5">Nível: {student.student_level}</p>
                      )}
                    </div>
                    <div className="shrink-0 w-full sm:w-64">
                      <Select
                        value={assignments[student.id] || ''}
                        onValueChange={(val) => setAssignments(prev => ({ ...prev, [student.id]: val }))}
                      >
                        <SelectTrigger className={!assignments[student.id] ? 'border-amber-500/50' : ''}>
                          <SelectValue placeholder="Selecionar professor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {otherTeachers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{t.full_name}</span>
                                {t.teacher_availability_summary && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {t.teacher_availability_summary}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          {otherTeachers.length === 0 && (
                            <SelectItem value="__none__" disabled>
                              Nenhum professor ativo disponível
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!allAssigned || isLoading || studentsLoading}
          >
            {isLoading ? 'Processando...' : 'Confirmar Redistribuição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Formulário de Professor ───────────────────────────────────────────────────

function TeacherForm({ teacher, onSubmit, buttonText }) {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="sm:text-right">Nome Completo</Label>
          <Input id="name" name="name" placeholder="Nome completo do professor"
            className="sm:col-span-3" data-testid="input-teacher-name"
            defaultValue={teacher?.full_name} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
          <Label htmlFor="cpf" className="sm:text-right">CPF</Label>
          <Input id="cpf" name="cpf" placeholder="000.000.000-00"
            className="sm:col-span-3" data-testid="input-teacher-cpf"
            defaultValue={teacher?.cpf} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
          <Label htmlFor="email" className="sm:text-right">Email</Label>
          <Input id="email" name="email" type="email" placeholder="email@exemplo.com"
            className="sm:col-span-3" data-testid="input-teacher-email"
            defaultValue={teacher?.email} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
          <Label htmlFor="phone" className="sm:text-right">Telefone</Label>
          <Input id="phone" name="phone" placeholder="(00) 00000-0000"
            className="sm:col-span-3" data-testid="input-teacher-phone"
            defaultValue={teacher?.phone} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
          <Label htmlFor="address" className="sm:text-right">Endereço</Label>
          <Textarea id="address" name="address" placeholder="Endereço completo"
            className="sm:col-span-3" defaultValue={teacher?.address} rows={2} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
          <Label htmlFor="teachingType" className="sm:text-right">Tipo</Label>
          <Select name="teachingType" defaultValue={teacher?.teacher_type || 'individual'}>
            <SelectTrigger className="sm:col-span-3" data-testid="select-teaching-type">
              <SelectValue placeholder="Tipo de ensino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="group">Grupo</SelectItem>
              <SelectItem value="both">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
          <Label htmlFor="hourlyRate" className="sm:text-right">Valor/Hora (R$)</Label>
          <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" min="0"
            placeholder="60.00" className="sm:col-span-3" data-testid="input-teacher-hourly-rate"
            defaultValue={teacher?.hourly_rate ? (teacher.hourly_rate / 100).toFixed(2) : ''} required />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" data-testid="button-save-teacher">{buttonText}</Button>
      </DialogFooter>
    </form>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────

export function TeacherManagement({ userRole = 'admin' }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null); // { teacher, action: 'delete'|'deactivate' }

  const { data: allTeachers = [], isLoading } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: () => apiRequest('/teachers'),
  });

  const { data: teacherStats } = useQuery({
    queryKey: ['/teachers/stats'],
    queryFn: () => apiRequest('/teachers/stats'),
  });

  const filteredTeachers = allTeachers.filter((teacher) => {
    const matchesSearch = searchTerm === '' ||
      teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && teacher.is_active) ||
      (statusFilter === 'inactive' && !teacher.is_active);
    return matchesSearch && matchesStatus && teacher.role === 'teacher';
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
    queryClient.invalidateQueries({ queryKey: ['/teachers/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
  };

  const createTeacherMutation = useMutation({
    mutationFn: (data) => apiRequest('/teachers', { method: 'POST', body: JSON.stringify({
      ...data, cpf: data.cpf?.replace(/\D/g, ''), phone: data.phone?.replace(/\D/g, ''),
      hourly_rate: Math.round(data.hourlyRate * 100), role: 'teacher',
    })}),
    onSuccess: () => { invalidate(); setIsAddDialogOpen(false); toast({ title: 'Professor criado com sucesso.' }); },
    onError: (e) => toast({ title: 'Erro ao criar professor', description: e.message, variant: 'destructive' }),
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { invalidate(); setEditingTeacher(null); toast({ title: 'Professor atualizado.' }); },
    onError: (e) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: (id) => apiRequest(`/teachers/${id}`, { method: 'DELETE' }),
    onSuccess: () => { invalidate(); toast({ title: 'Professor removido.' }); },
    onError: (e) => toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });

  const reassignMutation = useMutation({
    mutationFn: ({ teacherId, assignments }) =>
      apiRequest(`/teachers/${teacherId}/reassign`, { method: 'POST', body: JSON.stringify({ assignments }) }),
    onSuccess: (_, vars) => {
      if (vars.action === 'delete') {
        deleteTeacherMutation.mutate(vars.teacherId);
      } else {
        updateTeacherMutation.mutate({ id: vars.teacherId, data: { is_active: false } });
      }
      setReassignTarget(null);
    },
    onError: (e) => toast({ title: 'Erro na redistribuição', description: e.message, variant: 'destructive' }),
  });

  // Verifica alunos antes de excluir/inativar
  const checkAndActOnTeacher = async (teacher, action) => {
    try {
      const students = await apiRequest(`/teachers/${teacher.id}/students`);
      if (students && students.length > 0) {
        setReassignTarget({ teacher, action });
      } else {
        if (action === 'delete') deleteTeacherMutation.mutate(teacher.id);
        else updateTeacherMutation.mutate({ id: teacher.id, data: { is_active: false } });
      }
    } catch {
      if (action === 'delete') deleteTeacherMutation.mutate(teacher.id);
      else updateTeacherMutation.mutate({ id: teacher.id, data: { is_active: false } });
    }
  };

  const handleAddTeacher = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createTeacherMutation.mutate({
      full_name: fd.get('name'), email: fd.get('email'),
      phone: fd.get('phone'), cpf: fd.get('cpf'),
      address: fd.get('address'), teacher_type: fd.get('teachingType'),
      hourlyRate: parseFloat(fd.get('hourlyRate')), is_active: true,
    });
    e.currentTarget.reset();
  };

  const handleUpdateTeacher = (e) => {
    e.preventDefault();
    if (!editingTeacher) return;
    const fd = new FormData(e.currentTarget);
    updateTeacherMutation.mutate({ id: editingTeacher.id, data: {
      full_name: fd.get('name'), email: fd.get('email'),
      phone: fd.get('phone'), cpf: fd.get('cpf'),
      address: fd.get('address'), teacher_type: fd.get('teachingType'),
      hourly_rate: Math.round(parseFloat(fd.get('hourlyRate')) * 100),
    }});
    e.currentTarget.reset();
  };

  const getStatusBadge = (isActive) => isActive
    ? <Badge variant="secondary" className="text-green-600">Ativo</Badge>
    : <Badge variant="destructive">Inativo</Badge>;

  const getTeachingTypeBadge = (type) => {
    const map = { individual: 'Individual', group: 'Grupo', both: 'Ambos' };
    const colors = { individual: 'text-blue-600', group: 'text-purple-600', both: 'text-green-600' };
    return <Badge variant="outline" className={colors[type] || ''}>{map[type] || '-'}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lista de Professores</h2>
          <p className="text-muted-foreground">
            Gerencie todos os professores do sistema ({filteredTeachers.length} resultados)
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-teacher">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Professor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Professor</DialogTitle>
              <DialogDescription>Adicione um novo professor ao sistema.</DialogDescription>
            </DialogHeader>
            <TeacherForm onSubmit={handleAddTeacher} buttonText="Salvar" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Professores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">{teacherStats?.active || 0} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa Média/Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {teacherStats?.average_hourly_rate ? (teacherStats.average_hourly_rate / 100).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Valor médio por hora</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherStats?.total_students || 0}</div>
            <p className="text-xs text-muted-foreground">Todos os professores</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar professor..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64" data-testid="input-search-teacher" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professor</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor/h</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum professor encontrado.
                  </TableCell>
                </TableRow>
              ) : filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium">{teacher.full_name}</div>
                    <div className="text-xs text-muted-foreground">ID: {teacher.id.slice(-8)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{teacher.email}</div>
                    <div className="text-xs text-muted-foreground">{teacher.phone || '—'}</div>
                  </TableCell>
                  <TableCell>{getTeachingTypeBadge(teacher.teacher_type || 'individual')}</TableCell>
                  <TableCell className="font-medium">
                    R$ {teacher.hourly_rate ? (teacher.hourly_rate / 100).toFixed(2) : '0.00'}
                  </TableCell>
                  <TableCell>{getStatusBadge(teacher.is_active)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* Edit */}
                      <Dialog open={editingTeacher?.id === teacher.id} onOpenChange={(o) => !o && setEditingTeacher(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm"
                            data-testid={`button-edit-teacher-${teacher.id}`}
                            onClick={() => setEditingTeacher(teacher)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Professor</DialogTitle>
                            <DialogDescription>Atualize as informações do professor.</DialogDescription>
                          </DialogHeader>
                          <TeacherForm teacher={editingTeacher || undefined}
                            onSubmit={handleUpdateTeacher} buttonText="Atualizar" />
                        </DialogContent>
                      </Dialog>

                      {/* Toggle ativo/inativo */}
                      {teacher.is_active && (
                        <Button variant="ghost" size="sm" title="Inativar professor"
                          className="text-amber-500 hover:text-amber-600"
                          onClick={() => checkAndActOnTeacher(teacher, 'deactivate')}>
                          <Users className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete */}
                      <Button variant="ghost" size="sm" title="Remover professor"
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-teacher-${teacher.id}`}
                        onClick={() => checkAndActOnTeacher(teacher, 'delete')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de redistribuição */}
      <ReassignModal
        teacher={reassignTarget?.teacher || null}
        open={!!reassignTarget}
        onClose={() => setReassignTarget(null)}
        isLoading={reassignMutation.isPending}
        onConfirm={(assignments) => {
          reassignMutation.mutate({
            teacherId: reassignTarget.teacher.id,
            action: reassignTarget.action,
            assignments,
          });
        }}
      />
    </div>
  );
}
