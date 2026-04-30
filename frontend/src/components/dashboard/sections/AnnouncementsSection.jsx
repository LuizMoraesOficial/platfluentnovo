import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  AlertCircle,
  Calendar,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Info
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AnnouncementsSection({ userRole, userId }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'medium' });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['/announcements'],
    queryFn: () => apiRequest('/announcements')
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('/announcements', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/announcements'] });
      toast({ title: "Aviso publicado!", description: "O aviso foi enviado para todos os usuários." });
      setIsCreateOpen(false);
      setFormData({ title: '', content: '', priority: 'medium' });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar aviso", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/announcements'] });
      toast({ title: "Aviso atualizado!", description: "O aviso foi atualizado com sucesso." });
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', priority: 'medium' });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar aviso", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/announcements'] });
      toast({ title: "Aviso excluído!", description: "O aviso foi removido com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir aviso", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.is_urgent ? 'urgent' : 'medium'
    });
    setEditingAnnouncement(announcement);
  };

  const canCreate = userRole === 'admin' || userRole === 'teacher';
  const canEdit = (announcement) => {
    if (userRole === 'admin') return true;
    if (userRole === 'teacher' && announcement.created_by === userId) return true;
    return false;
  };
  const canDelete = (announcement) => {
    if (userRole === 'admin') return true;
    if (userRole === 'teacher' && announcement.created_by === userId) return true;
    return false;
  };

  const getPriorityConfig = (announcement) => {
    if (announcement.is_urgent) {
      return { color: 'border-red-500', icon: AlertCircle, iconColor: 'text-red-500', badge: 'Urgente', badgeVariant: 'destructive' };
    }
    return { color: 'border-blue-500', icon: Info, iconColor: 'text-blue-500', badge: 'Informativo', badgeVariant: 'secondary' };
  };

  const formatDate = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Avisos</h2>
        {canCreate && (
          <Dialog open={isCreateOpen || !!editingAnnouncement} onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingAnnouncement(null);
              setFormData({ title: '', content: '', priority: 'medium' });
            } else {
              setIsCreateOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="transition-all hover:scale-105" data-testid="button-new-announcement">
                <Plus className="mr-2 h-4 w-4" />
                Novo Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? 'Editar Aviso' : 'Criar Novo Aviso'}</DialogTitle>
                <DialogDescription>
                  {editingAnnouncement ? 'Edite as informações do aviso.' : 'Publique um aviso para todos os usuários da plataforma.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="announcement-title">Título</Label>
                    <Input 
                      id="announcement-title" 
                      placeholder="Título do aviso" 
                      className="transition-all focus:ring-2 focus:ring-blue-500" 
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="announcement-content">Conteúdo</Label>
                    <Textarea 
                      id="announcement-content" 
                      placeholder="Conteúdo do aviso..." 
                      className="transition-all focus:ring-2 focus:ring-blue-500 resize-none min-h-24" 
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="announcement-priority">Prioridade</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="transition-all hover:scale-105" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingAnnouncement ? 'Salvar Alterações' : 'Publicar Aviso')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando avisos...</div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum aviso disponível no momento.
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement, index) => {
            const config = getPriorityConfig(announcement);
            const IconComponent = config.icon;
            
            return (
              <Card 
                key={announcement.id} 
                className={`animate-in fade-in-50 slide-in-from-bottom-2 border-l-4 ${config.color}`}
                style={{ animationDuration: `${300 + index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <Badge variant={config.badgeVariant} className="text-xs">{config.badge}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDate(announcement.created_at)}</span>
                      {canEdit(announcement) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(announcement)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete(announcement) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir aviso?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O aviso será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteMutation.mutate(announcement.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{announcement.content}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
