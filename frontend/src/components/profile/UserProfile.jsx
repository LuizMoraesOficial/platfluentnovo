import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
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
  Textarea 
} from '@/components/ui/textarea';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from '@/components/ui/avatar';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  User, 
  Edit, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap,
  Star,
  Clock,
  CreditCard,
  Shield,
  Settings,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UserProfile({ userRole = 'teacher', userName }) {
  const { toast } = useToast();
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
    }
  }, [authProfile]);

  if (!profile) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Carregando perfil...
      </div>
    );
  }

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updatedProfile = {
      ...profile,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      cpf: formData.get('cpf'),
      address: formData.get('address'),
      dateOfBirth: formData.get('dateOfBirth'),
    };

    // Add role-specific fields
    if (profile.role === 'teacher') {
      updatedProfile.teachingType = formData.get('teachingType');
      updatedProfile.hourlyRate = parseFloat(formData.get('hourlyRate'));
    } else if (profile.role === 'student') {
      updatedProfile.englishLevel = formData.get('englishLevel');
    }

    setProfile(updatedProfile);
    setIsEditing(false);
    setEditingSection(null);
    
    toast({
      title: 'Perfil atualizado!',
      description: 'Suas informações foram salvas com sucesso.',
    });
  };

  const handleUploadPhoto = () => {
    setIsPhotoDialogOpen(false);
    toast({
      title: 'Upload de foto não disponível',
      description: 'A funcionalidade de envio de imagem será ativada em breve.',
    });
  };

  const getRoleBadge = () => {
    switch (profile.role) {
      case 'admin':
        return <Badge variant="destructive">Administrador</Badge>;
      case 'teacher':
        return <Badge variant="secondary" className="text-blue-600">Professor</Badge>;
      case 'student':
        return <Badge variant="outline" className="text-green-600">Aluno</Badge>;
      default:
        return <Badge variant="outline">Usuário</Badge>;
    }
  };

  const getStatusBadge = () => {
    switch (profile.status) {
      case 'active':
        return <Badge variant="secondary" className="text-green-600">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inativo</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meu Perfil</h2>
        <Button 
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          className="transition-all hover:scale-105"
          data-testid="button-edit-profile"
        >
          {isEditing ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Editar Perfil
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 animate-in fade-in-50 slide-in-from-left-2 duration-300">
          <CardHeader className="text-center">
            <div className="relative mx-auto">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="text-lg">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    data-testid="button-change-photo"
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Alterar Foto de Perfil</DialogTitle>
                    <DialogDescription>
                      Selecione uma nova foto para seu perfil.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      data-testid="input-profile-photo"
                    />
                    <div className="text-sm text-muted-foreground">
                      Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleUploadPhoto} data-testid="button-upload-photo">
                      Salvar Foto
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">{profile.name}</CardTitle>
              <div className="flex flex-wrap gap-2 justify-center">
                {getRoleBadge()}
                {getStatusBadge()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Desde {new Date(profile.joinedDate).toLocaleDateString('pt-BR')}</span>
            </div>
            
            {/* Role-specific stats */}
            {profile.role === 'teacher' && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Alunos:</span>
                  <span className="font-medium">{profile.totalStudents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Aulas:</span>
                  <span className="font-medium">{profile.totalClasses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avaliação:</span>
                  <span className="font-medium">★ {profile.rating}</span>
                </div>
              </div>
            )}
            
            {profile.role === 'student' && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Nível:</span>
                  <span className="font-medium capitalize">{profile.englishLevel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Aulas:</span>
                  <span className="font-medium">{profile.totalLessons}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Sequência:</span>
                  <span className="font-medium">{profile.currentStreak} dias</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="md:col-span-2 animate-in fade-in-50 slide-in-from-right-2 duration-300">
          <CardHeader>
            <CardTitle>Informações Detalhadas</CardTitle>
            <CardDescription>Gerencie suas informações pessoais e profissionais</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Pessoal</TabsTrigger>
                <TabsTrigger value="professional">Profissional</TabsTrigger>
                <TabsTrigger value="security">Segurança</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input 
                          id="name" 
                          name="name"
                          defaultValue={profile.name}
                          data-testid="input-profile-name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          name="email"
                          type="email"
                          defaultValue={profile.email}
                          data-testid="input-profile-email"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input 
                          id="phone" 
                          name="phone"
                          defaultValue={profile.phone}
                          data-testid="input-profile-phone"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input 
                          id="cpf" 
                          name="cpf"
                          defaultValue={profile.cpf}
                          data-testid="input-profile-cpf"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço Completo</Label>
                      <Textarea 
                        id="address" 
                        name="address"
                        defaultValue={profile.address}
                        data-testid="input-profile-address"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Data de Nascimento</Label>
                      <Input 
                        id="dateOfBirth" 
                        name="dateOfBirth"
                        type="date"
                        defaultValue={profile.dateOfBirth}
                        data-testid="input-profile-birth-date"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full transition-all hover:scale-105"
                      data-testid="button-save-profile"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Nome Completo</Label>
                        <p className="mt-1">{profile.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="mt-1">{profile.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                        <p className="mt-1">{profile.phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
                        <p className="mt-1">{profile.cpf}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
                      <p className="mt-1">{profile.address}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
                      <p className="mt-1">{new Date(profile.dateOfBirth).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="professional" className="space-y-4">
                {profile.role === 'teacher' && (
                  <>
                    {isEditing ? (
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="teachingType">Tipo de Ensino</Label>
                            <Select name="teachingType" defaultValue={profile.teachingType}>
                              <SelectTrigger data-testid="select-teaching-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="group">Grupo</SelectItem>
                                <SelectItem value="both">Ambos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hourlyRate">Valor por Hora (R$)</Label>
                            <Input 
                              id="hourlyRate" 
                              name="hourlyRate"
                              type="number"
                              step="0.01"
                              defaultValue={profile.hourlyRate}
                              data-testid="input-hourly-rate"
                            />
                          </div>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full transition-all hover:scale-105"
                          data-testid="button-save-professional"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </Button>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Tipo de Ensino</Label>
                            <p className="mt-1 capitalize">{profile.teachingType}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Valor por Hora</Label>
                            <p className="mt-1">R$ {profile.hourlyRate}</p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Especializações</Label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {profile.specializations?.map((spec, index) => (
                              <Badge key={index} variant="outline">{spec}</Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{profile.totalStudents}</div>
                            <div className="text-sm text-muted-foreground">Alunos</div>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{profile.totalClasses}</div>
                            <div className="text-sm text-muted-foreground">Aulas</div>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">★ {profile.rating}</div>
                            <div className="text-sm text-muted-foreground">Avaliação</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {profile.role === 'student' && (
                  <>
                    {isEditing ? (
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="englishLevel">Nível de Inglês</Label>
                          <Select name="englishLevel" defaultValue={profile.englishLevel}>
                            <SelectTrigger data-testid="select-english-level">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Iniciante</SelectItem>
                              <SelectItem value="elementary">Básico</SelectItem>
                              <SelectItem value="intermediate">Intermediário</SelectItem>
                              <SelectItem value="advanced">Avançado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full transition-all hover:scale-105"
                          data-testid="button-save-student-info"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </Button>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Nível de Inglês</Label>
                          <p className="mt-1 capitalize">{profile.englishLevel}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Objetivos de Aprendizado</Label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {profile.learningGoals?.map((goal, index) => (
                              <Badge key={index} variant="outline">{goal}</Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{profile.totalLessons}</div>
                            <div className="text-sm text-muted-foreground">Aulas Realizadas</div>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{profile.currentStreak}</div>
                            <div className="text-sm text-muted-foreground">Dias Consecutivos</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="security" className="space-y-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Segurança da Conta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Alterar Senha</p>
                          <p className="text-sm text-muted-foreground">Última alteração há 3 meses</p>
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-change-password">
                          Alterar
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Autenticação em Duas Etapas</p>
                          <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-setup-2fa">
                          Configurar
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Sessões Ativas</p>
                          <p className="text-sm text-muted-foreground">Gerencie dispositivos conectados</p>
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-manage-sessions">
                          Ver Sessões
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Privacidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Visibilidade do Perfil</p>
                          <p className="text-sm text-muted-foreground">Controle quem pode ver suas informações</p>
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-privacy-settings">
                          Configurar
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Baixar Dados</p>
                          <p className="text-sm text-muted-foreground">Faça download dos seus dados</p>
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-download-data">
                          Baixar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { UserProfile };