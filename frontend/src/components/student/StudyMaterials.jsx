import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Download, Upload, FileText, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

const LEVELS = [
  { value: 'all', label: 'Todos os Níveis' },
  { value: 'beginner', label: 'Iniciante (Start)' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
];

const CATEGORIES = ['Gramática', 'Vocabulário', 'Listening', 'Speaking', 'Reading', 'Writing', 'Business English', 'Geral'];

const typeIcon = (type) => {
  if (!type) return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (type.includes('pdf') || type.includes('PDF')) return <FileText className="h-4 w-4 text-red-500" />;
  return <BookOpen className="h-4 w-4 text-blue-500" />;
};

export function StudyMaterials({ studentLevel = 'intermediate' }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeLevel, setActiveLevel] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['/api/materials', activeLevel],
    queryFn: () => apiRequest(`/materials${activeLevel !== 'all' ? `?level=${activeLevel}` : ''}`),
    staleTime: 1000 * 60 * 2,
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('/materials', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      setUploadOpen(false);
      toast({ title: 'Material adicionado!', description: 'O material está disponível para os alunos.' });
    },
    onError: (err) => toast({ title: 'Erro ao adicionar material', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/materials/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      toast({ title: 'Material removido.' });
    },
    onError: (err) => toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' }),
  });

  const isAdminOrTeacher = profile?.role === 'admin' || profile?.role === 'teacher';

  const handleUpload = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    createMutation.mutate({
      title: fd.get('title'),
      description: fd.get('description') || null,
      file_url: fd.get('file_url') || null,
      material_type: fd.get('material_type') || null,
      level: fd.get('level') || null,
      category: fd.get('category') || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Materiais de Estudo
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{materials.length} {materials.length === 1 ? 'item' : 'itens'}</Badge>
          {isAdminOrTeacher && (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Adicionar Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Material Didático</DialogTitle>
                  <DialogDescription>Disponibilize um novo material para os alunos.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Título *</Label>
                      <Input id="title" name="title" placeholder="Ex: Present Perfect Exercises" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" name="description" placeholder="Breve descrição do material..." className="resize-none" rows={2} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="file_url">Link do Arquivo (URL)</Label>
                      <Input id="file_url" name="file_url" type="url" placeholder="https://drive.google.com/..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Tipo</Label>
                        <Select name="material_type" defaultValue="PDF">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PDF">PDF</SelectItem>
                            <SelectItem value="Vídeo">Vídeo</SelectItem>
                            <SelectItem value="Áudio">Áudio</SelectItem>
                            <SelectItem value="Exercício">Exercício</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Nível</Label>
                        <Select name="level">
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Iniciante</SelectItem>
                            <SelectItem value="intermediate">Intermediário</SelectItem>
                            <SelectItem value="advanced">Avançado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Categoria</Label>
                      <Select name="category">
                        <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Adicionar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeLevel} onValueChange={setActiveLevel}>
        <TabsList>
          {LEVELS.map(l => <TabsTrigger key={l.value} value={l.value}>{l.label}</TabsTrigger>)}
        </TabsList>

        {LEVELS.map(l => (
          <TabsContent key={l.value} value={l.value} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : materials.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum material disponível</p>
                  <p className="text-sm mt-1">
                    {isAdminOrTeacher
                      ? 'Adicione materiais usando o botão acima.'
                      : 'Materiais serão liberados pelo seu professor em breve.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {materials.map((mat) => (
                  <Card key={mat.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-2">
                        {typeIcon(mat.material_type)}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-snug">{mat.title}</CardTitle>
                          {mat.category && (
                            <CardDescription className="text-xs mt-0.5">{mat.category}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {mat.description && <p className="text-sm text-muted-foreground">{mat.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        {mat.material_type && <Badge variant="secondary" className="text-xs">{mat.material_type}</Badge>}
                        {mat.level && <Badge variant="outline" className="text-xs capitalize">{mat.level}</Badge>}
                      </div>
                      <div className="flex gap-2">
                        {mat.file_url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(mat.file_url, '_blank')}
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Acessar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="flex-1" disabled>
                            Sem link
                          </Button>
                        )}
                        {isAdminOrTeacher && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(mat.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
