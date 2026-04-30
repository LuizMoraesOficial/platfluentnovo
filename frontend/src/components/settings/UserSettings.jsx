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
  Switch 
} from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Separator 
} from '@/components/ui/separator';
import { 
  Slider 
} from '@/components/ui/slider';
import { 
  Bell, 
  Globe, 
  Palette, 
  Shield, 
  Clock, 
  Volume2, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Monitor,
  Sun,
  Moon,
  Smartphone,
  Settings,
  Save,
  RefreshCw,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const defaultSettings = {
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'DD/MM/YYYY',
  
  theme: 'system',
  fontSize: 14,
  reducedMotion: false,
  
  emailNotifications: true,
  pushNotifications: true,
  classReminders: true,
  paymentReminders: true,
  systemUpdates: true,
  marketingEmails: false,
  reminderTime: 15,
  
  profileVisibility: 'members-only',
  showOnlineStatus: true,
  allowDirectMessages: true,
  
  autoScheduling: false,
  preferredClassDuration: 60,
  breakBetweenClasses: 15,
  workingHours: {
    start: '08:00',
    end: '18:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  
  microphoneLevel: 80,
  speakerLevel: 70,
  cameraQuality: 'medium',
  autoJoinAudio: true,
  autoJoinVideo: false,
  
  autoBackup: true,
  dataRetention: 12,
  exportFormat: 'pdf'
};

export default function UserSettings({ userRole = 'teacher', userName }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(defaultSettings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const updateNestedSetting = (parentKey, childKey, value) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = () => {
    // Simular salvamento
    setHasUnsavedChanges(false);
    toast({
      title: 'Configurações salvas!',
      description: 'Suas preferências foram atualizadas com sucesso.',
    });
  };

  const handleResetSettings = () => {
    setSettings(defaultSettings);
    setHasUnsavedChanges(true);
    toast({
      title: 'Configurações restauradas!',
      description: 'Todas as configurações foram redefinidas para o padrão.',
    });
  };

  const handleExportSettings = () => {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'configuracoes-befluent.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Configurações exportadas!',
      description: 'O arquivo foi baixado com suas configurações.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Configurações</h2>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <Button 
              onClick={handleSaveSettings}
              className="transition-all hover:scale-105"
              data-testid="button-save-settings"
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={handleExportSettings}
            data-testid="button-export-settings"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
          <TabsTrigger value="classes">Aulas</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Idioma e Região
              </CardTitle>
              <CardDescription>Configure seu idioma, fuso horário e formato de data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value) => updateSetting('language', value)}
                  >
                    <SelectTrigger data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                      <SelectItem value="fr-FR">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => updateSetting('timezone', value)}
                  >
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                      <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid (UTC+1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Formato de Data</Label>
                <Select 
                  value={settings.dateFormat} 
                  onValueChange={(value) => updateSetting('dateFormat', value)}
                >
                  <SelectTrigger data-testid="select-date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/AAAA (15/01/2025)</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/AAAA (01/15/2025)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">AAAA-MM-DD (2025-01-15)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>Personalize a aparência da interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Tema</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      settings.theme === 'light' ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => updateSetting('theme', 'light')}
                    data-testid="theme-light"
                  >
                    <Sun className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-center text-sm">Claro</p>
                  </div>
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      settings.theme === 'dark' ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => updateSetting('theme', 'dark')}
                    data-testid="theme-dark"
                  >
                    <Moon className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-center text-sm">Escuro</p>
                  </div>
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      settings.theme === 'system' ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => updateSetting('theme', 'system')}
                    data-testid="theme-system"
                  >
                    <Monitor className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-center text-sm">Sistema</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Tamanho da Fonte: {settings.fontSize}px</Label>
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={([value]) => updateSetting('fontSize', value)}
                  min={12}
                  max={20}
                  step={1}
                  className="w-full"
                  data-testid="slider-font-size"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Pequeno</span>
                  <span>Grande</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reduzir Animações</Label>
                  <p className="text-sm text-muted-foreground">
                    Diminui animações para melhor performance
                  </p>
                </div>
                <Switch
                  checked={settings.reducedMotion}
                  onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
                  data-testid="switch-reduced-motion"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>Configure como e quando receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">Receber emails importantes</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                    data-testid="switch-email-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">Notificações no navegador</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                    data-testid="switch-push-notifications"
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Aula</Label>
                    <p className="text-sm text-muted-foreground">Avisos antes das aulas</p>
                  </div>
                  <Switch
                    checked={settings.classReminders}
                    onCheckedChange={(checked) => updateSetting('classReminders', checked)}
                    data-testid="switch-class-reminders"
                  />
                </div>
                
                {settings.classReminders && (
                  <div className="ml-6 space-y-2">
                    <Label>Avisar com antecedência de: {settings.reminderTime} minutos</Label>
                    <Slider
                      value={[settings.reminderTime]}
                      onValueChange={([value]) => updateSetting('reminderTime', value)}
                      min={5}
                      max={60}
                      step={5}
                      className="w-full"
                      data-testid="slider-reminder-time"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Pagamento</Label>
                    <p className="text-sm text-muted-foreground">Avisos sobre pagamentos</p>
                  </div>
                  <Switch
                    checked={settings.paymentReminders}
                    onCheckedChange={(checked) => updateSetting('paymentReminders', checked)}
                    data-testid="switch-payment-reminders"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Atualizações do Sistema</Label>
                    <p className="text-sm text-muted-foreground">Novidades e melhorias</p>
                  </div>
                  <Switch
                    checked={settings.systemUpdates}
                    onCheckedChange={(checked) => updateSetting('systemUpdates', checked)}
                    data-testid="switch-system-updates"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Emails de Marketing</Label>
                    <p className="text-sm text-muted-foreground">Promoções e novos cursos</p>
                  </div>
                  <Switch
                    checked={settings.marketingEmails}
                    onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
                    data-testid="switch-marketing-emails"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacidade
              </CardTitle>
              <CardDescription>Configure a visibilidade do seu perfil e dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Visibilidade do Perfil</Label>
                <Select 
                  value={settings.profileVisibility} 
                  onValueChange={(value) => updateSetting('profileVisibility', value)}
                >
                  <SelectTrigger data-testid="select-profile-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Público</SelectItem>
                    <SelectItem value="members-only">Apenas Membros</SelectItem>
                    <SelectItem value="private">Privado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {settings.profileVisibility === 'public' && 'Qualquer pessoa pode ver seu perfil'}
                  {settings.profileVisibility === 'members-only' && 'Apenas alunos e professores podem ver'}
                  {settings.profileVisibility === 'private' && 'Apenas você pode ver seu perfil'}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Status Online</Label>
                  <p className="text-sm text-muted-foreground">
                    Outros usuários podem ver quando você está online
                  </p>
                </div>
                <Switch
                  checked={settings.showOnlineStatus}
                  onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
                  data-testid="switch-online-status"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Mensagens Diretas</Label>
                  <p className="text-sm text-muted-foreground">
                    Outros usuários podem enviar mensagens privadas
                  </p>
                </div>
                <Switch
                  checked={settings.allowDirectMessages}
                  onCheckedChange={(checked) => updateSetting('allowDirectMessages', checked)}
                  data-testid="switch-direct-messages"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Preferências de Aulas
              </CardTitle>
              <CardDescription>Configure suas preferências para agendamento e aulas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {userRole === 'teacher' && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Agendamento Automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Permitir que alunos agendem automaticamente em horários livres
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoScheduling}
                      onCheckedChange={(checked) => updateSetting('autoScheduling', checked)}
                      data-testid="switch-auto-scheduling"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duração Preferida (minutos)</Label>
                      <Select 
                        value={settings.preferredClassDuration.toString()} 
                        onValueChange={(value) => updateSetting('preferredClassDuration', parseInt(value))}
                      >
                        <SelectTrigger data-testid="select-class-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="90">1h 30min</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Intervalo entre Aulas (minutos)</Label>
                      <Select 
                        value={settings.breakBetweenClasses.toString()} 
                        onValueChange={(value) => updateSetting('breakBetweenClasses', parseInt(value))}
                      >
                        <SelectTrigger data-testid="select-break-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sem intervalo</SelectItem>
                          <SelectItem value="10">10 minutos</SelectItem>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Horário de Trabalho</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="work-start">Início</Label>
                        <Input
                          id="work-start"
                          type="time"
                          value={settings.workingHours.start}
                          onChange={(e) => updateNestedSetting('workingHours', 'start', e.target.value)}
                          data-testid="input-work-start"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="work-end">Fim</Label>
                        <Input
                          id="work-end"
                          type="time"
                          value={settings.workingHours.end}
                          onChange={(e) => updateNestedSetting('workingHours', 'end', e.target.value)}
                          data-testid="input-work-end"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-4">
                <Label>Configurações de Áudio/Vídeo</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Volume do Microfone: {settings.microphoneLevel}%</Label>
                    <Slider
                      value={[settings.microphoneLevel]}
                      onValueChange={([value]) => updateSetting('microphoneLevel', value)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                      data-testid="slider-microphone-level"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Volume do Alto-falante: {settings.speakerLevel}%</Label>
                    <Slider
                      value={[settings.speakerLevel]}
                      onValueChange={([value]) => updateSetting('speakerLevel', value)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                      data-testid="slider-speaker-level"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Qualidade da Câmera</Label>
                    <Select 
                      value={settings.cameraQuality} 
                      onValueChange={(value) => updateSetting('cameraQuality', value)}
                    >
                      <SelectTrigger data-testid="select-camera-quality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa (economia de dados)</SelectItem>
                        <SelectItem value="medium">Média (recomendado)</SelectItem>
                        <SelectItem value="high">Alta (melhor qualidade)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Conectar Áudio Automaticamente</Label>
                    <Switch
                      checked={settings.autoJoinAudio}
                      onCheckedChange={(checked) => updateSetting('autoJoinAudio', checked)}
                      data-testid="switch-auto-join-audio"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Conectar Vídeo Automaticamente</Label>
                    <Switch
                      checked={settings.autoJoinVideo}
                      onCheckedChange={(checked) => updateSetting('autoJoinVideo', checked)}
                      data-testid="switch-auto-join-video"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>Backup, exportação e outras configurações técnicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Backup Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Fazer backup dos dados automaticamente
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                    data-testid="switch-auto-backup"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Retenção de Dados: {settings.dataRetention} meses</Label>
                  <Slider
                    value={[settings.dataRetention]}
                    onValueChange={([value]) => updateSetting('dataRetention', value)}
                    min={3}
                    max={36}
                    step={3}
                    className="w-full"
                    data-testid="slider-data-retention"
                  />
                  <p className="text-sm text-muted-foreground">
                    Por quanto tempo manter os dados antes de arquivar
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Formato de Exportação</Label>
                  <Select 
                    value={settings.exportFormat} 
                    onValueChange={(value) => updateSetting('exportFormat', value)}
                  >
                    <SelectTrigger data-testid="select-export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Ações do Sistema</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleResetSettings}
                    data-testid="button-reset-settings"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Restaurar Padrão
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleExportSettings}
                    data-testid="button-export-all-settings"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Tudo
                  </Button>
                </div>
                
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
                  <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Zona de Perigo</h5>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                    Estas ações são irreversíveis. Use com cuidado.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Conta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { UserSettings };