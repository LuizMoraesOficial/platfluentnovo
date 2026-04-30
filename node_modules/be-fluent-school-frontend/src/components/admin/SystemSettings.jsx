import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, Upload, Download, Database, Shield, Bell, Palette, Globe, Key, CreditCard, Eye, EyeOff, Image, Type, Loader2, Monitor, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function SystemSettings({ userRole = 'admin'  }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAsaasToken, setShowAsaasToken] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({
    activeProvider: 'asaas',
    asaasApiToken: '',
    asaasSandbox: true
  });

  const { data: savedPaymentSettings } = useQuery({
    queryKey: ['/settings/payments'],
    queryFn: () => apiRequest('/settings/payments')
  });

  useEffect(() => {
    if (savedPaymentSettings) {
      setPaymentSettings(prev => ({
        ...prev,
        ...savedPaymentSettings
      }));
    }
  }, [savedPaymentSettings]);

  const savePaymentMutation = useMutation({
    mutationFn: (data) => apiRequest('/settings/payments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/settings/payments'] });
      toast({
        title: "Configurações de pagamento salvas!",
        description: "As chaves de API foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSavePaymentSettings = () => {
    savePaymentMutation.mutate(paymentSettings);
  };
  
  const [settings, setSettings] = useState({
    general: {
      schoolName: '',
      schoolEmail: '',
      schoolPhone: '',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      currency: 'BRL'
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      weeklyReports: true,
      classReminders: true
    },
    security: {
      twoFactorAuth: true,
      passwordExpiry: 90,
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      requireStrongPassword: true,
      enableIpWhitelist: false
    },
    features: {
      enableGamification: true,
      enableVideoRecording: true,
      enableFileSharing: true,
      enableAdvancedReports: true,
      enableMobileApp: true,
      enableAiAssistant: true
    },
    integrations: {
      googleMeet: true,
      googleCalendar: true,
      googleDrive: false,
      zoom: false,
      whatsapp: true,
    }
  });

  const handleSaveSettings = (category) => {
    toast({
      title: "Configurações salvas!",
      description: `As configurações de ${category} foram atualizadas com sucesso.`,
    });
  };

  const handleBackupSystem = () => {
    toast({
      title: "Backup iniciado",
      description: "O backup do sistema foi iniciado. Você receberá uma notificação quando concluído.",
    });
  };

  const handleRestoreSystem = () => {
    toast({
      title: "Restauração iniciada",
      description: "A restauração do sistema foi iniciada. Por favor, aguarde...",
    });
  };

  const [appearanceSettings, setAppearanceSettings] = useState({
    hero_title: 'Ofereça aulas de inglês com confiança e profissionalismo',
    hero_subtitle: 'Gerencie sua escola, professores e alunos em um único painel.',
    hero_cta_text: 'Entre em contato',
    announcement_bar: '',
    announcement_bar_enabled: false,
    primary_color: '#E59313',
    dark_color: '#2B2B2B',
    stats_students: '',
    stats_experience: '',
    stats_satisfaction: '',
    footer_whatsapp: '',
    footer_email: '',
  });

  const { data: savedAppearanceSettings, isLoading: isLoadingAppearance } = useQuery({
    queryKey: ['/settings/appearance'],
    queryFn: () => apiRequest('/settings/appearance')
  });

  useEffect(() => {
    if (savedAppearanceSettings && Array.isArray(savedAppearanceSettings)) {
      const parsed = {};
      savedAppearanceSettings.forEach(s => {
        parsed[s.setting_key] = s.setting_type === 'boolean' ? s.setting_value === 'true' : s.setting_value;
      });
      setAppearanceSettings(prev => ({ ...prev, ...parsed }));
    }
  }, [savedAppearanceSettings]);

  const saveAppearanceMutation = useMutation({
    mutationFn: (data) => {
      const settings = Object.entries(data).map(([key, value]) => ({
        key,
        value: String(value),
        type: typeof value === 'boolean' ? 'boolean' : 'text',
        category: 'appearance',
        label: key.replace(/_/g, ' '),
        description: ''
      }));
      return apiRequest('/settings/appearance', { method: 'PUT', body: JSON.stringify({ settings }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/settings/appearance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/site-settings'] });
      toast({ title: "Aparência salva!", description: "As configurações visuais foram atualizadas." });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  });

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações do Sistema
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackupSystem}>
            <Download className="mr-2 h-4 w-4" />
            Backup
          </Button>
          <Button variant="outline" onClick={handleRestoreSystem}>
            <Upload className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="features">Recursos</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>
                Configurações básicas da escola e localização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Nome da Escola</Label>
                  <Input
                    id="schoolName"
                    value={settings.general.schoolName}
                    onChange={(e) => updateSetting('general', 'schoolName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">Email da Escola</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={settings.general.schoolEmail}
                    onChange={(e) => updateSetting('general', 'schoolEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">Telefone da Escola</Label>
                  <Input
                    id="schoolPhone"
                    value={settings.general.schoolPhone}
                    onChange={(e) => updateSetting('general', 'schoolPhone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select value={settings.general.timezone} onValueChange={(value) => updateSetting('general', 'timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={settings.general.language} onValueChange={(value) => updateSetting('general', 'language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">🇧🇷 Português (BR)</SelectItem>
                      <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                      <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select value={settings.general.currency} onValueChange={(value) => updateSetting('general', 'currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (R$)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => handleSaveSettings('gerais')} className="transition-all hover:scale-105">
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure as notificações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações por Email</h4>
                    <p className="text-sm text-muted-foreground">Enviar notificações importantes por email</p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'emailNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações SMS</h4>
                    <p className="text-sm text-muted-foreground">Enviar notificações urgentes via SMS</p>
                  </div>
                  <Switch
                    checked={settings.notifications.smsNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'smsNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações Push</h4>
                    <p className="text-sm text-muted-foreground">Enviar notificações push no app</p>
                  </div>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'pushNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Emails de Marketing</h4>
                    <p className="text-sm text-muted-foreground">Enviar newsletters e promoções</p>
                  </div>
                  <Switch
                    checked={settings.notifications.marketingEmails}
                    onCheckedChange={(checked) => updateSetting('notifications', 'marketingEmails', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Relatórios Semanais</h4>
                    <p className="text-sm text-muted-foreground">Enviar relatórios automáticos</p>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReports}
                    onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Lembretes de Aula</h4>
                    <p className="text-sm text-muted-foreground">Lembrar alunos sobre aulas próximas</p>
                  </div>
                  <Switch
                    checked={settings.notifications.classReminders}
                    onCheckedChange={(checked) => updateSetting('notifications', 'classReminders', checked)}
                  />
                </div>
              </div>
              <Button onClick={() => handleSaveSettings('notificações')} className="transition-all hover:scale-105">
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>
                Configure as políticas de segurança do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                    <p className="text-sm text-muted-foreground">Exigir 2FA para todos os usuários</p>
                  </div>
                  <Switch
                    checked={settings.security.twoFactorAuth}
                    onCheckedChange={(checked) => updateSetting('security', 'twoFactorAuth', checked)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="passwordExpiry">Expiração de Senha (dias)</Label>
                    <Input
                      id="passwordExpiry"
                      type="number"
                      value={settings.security.passwordExpiry}
                      onChange={(e) => updateSetting('security', 'passwordExpiry', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Timeout de Sessão (min)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Máx. Tentativas de Login</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Senha Forte Obrigatória</h4>
                    <p className="text-sm text-muted-foreground">Exigir senhas complexas</p>
                  </div>
                  <Switch
                    checked={settings.security.requireStrongPassword}
                    onCheckedChange={(checked) => updateSetting('security', 'requireStrongPassword', checked)}
                  />
                </div>
              </div>
              <Button onClick={() => handleSaveSettings('segurança')} className="transition-all hover:scale-105">
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recursos da Plataforma</CardTitle>
              <CardDescription>
                Habilite ou desabilite recursos específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">🏆 Gamificação</h4>
                    <p className="text-sm text-muted-foreground">Sistema de pontos e badges</p>
                  </div>
                  <Switch
                    checked={settings.features.enableGamification}
                    onCheckedChange={(checked) => updateSetting('features', 'enableGamification', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">📹 Gravação de Vídeo</h4>
                    <p className="text-sm text-muted-foreground">Gravar aulas automaticamente</p>
                  </div>
                  <Switch
                    checked={settings.features.enableVideoRecording}
                    onCheckedChange={(checked) => updateSetting('features', 'enableVideoRecording', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">📁 Compartilhamento</h4>
                    <p className="text-sm text-muted-foreground">Upload e download de arquivos</p>
                  </div>
                  <Switch
                    checked={settings.features.enableFileSharing}
                    onCheckedChange={(checked) => updateSetting('features', 'enableFileSharing', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">📊 Relatórios Avançados</h4>
                    <p className="text-sm text-muted-foreground">Analytics e insights</p>
                  </div>
                  <Switch
                    checked={settings.features.enableAdvancedReports}
                    onCheckedChange={(checked) => updateSetting('features', 'enableAdvancedReports', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">📱 App Mobile</h4>
                    <p className="text-sm text-muted-foreground">PWA e notificações push</p>
                  </div>
                  <Switch
                    checked={settings.features.enableMobileApp}
                    onCheckedChange={(checked) => updateSetting('features', 'enableMobileApp', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">🤖 Assistente IA</h4>
                    <p className="text-sm text-muted-foreground">Chat inteligente e suporte</p>
                  </div>
                  <Switch
                    checked={settings.features.enableAiAssistant}
                    onCheckedChange={(checked) => updateSetting('features', 'enableAiAssistant', checked)}
                  />
                </div>
              </div>
              <Button onClick={() => handleSaveSettings('recursos')} className="transition-all hover:scale-105">
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Configurações de Pagamento
              </CardTitle>
              <CardDescription>
                Configure a chave de API do Asaas para processar pagamentos (PIX, boleto e cartão)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#4f46e5] flex items-center justify-center shadow-sm shadow-violet-500/20">
                      <svg viewBox="0 0 32 32" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 16L16 8l8 8-8 8-8-8Z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Asaas</h4>
                      <p className="text-sm text-muted-foreground">Processamento de pagamentos PIX, boleto e cartão</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ativo</span>
                    <Switch
                      checked={true}
                      disabled
                    />
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Ambiente ASAAS</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${paymentSettings.asaasSandbox ? 'border-border bg-background text-foreground' : 'border-transparent bg-primary text-primary-foreground shadow-sm'}`}
                        onClick={() => setPaymentSettings(prev => ({ ...prev, asaasSandbox: false }))}
                      >
                        Produção
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${paymentSettings.asaasSandbox ? 'border-transparent bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background text-foreground'}`}
                        onClick={() => setPaymentSettings(prev => ({ ...prev, asaasSandbox: true }))}
                      >
                        Sandbox
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asaasApiToken">
                      {paymentSettings.asaasSandbox ? 'Token API Sandbox' : 'Token API Real'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="asaasApiToken"
                        type={showAsaasToken ? "text" : "password"}
                        placeholder="$aact_..."
                        value={paymentSettings.asaasApiToken}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, asaasApiToken: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowAsaasToken(!showAsaasToken)}
                      >
                        {showAsaasToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Informe o token correspondente ao ambiente selecionado.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Obtenha seu token em{' '}
                  <a href="https://www.asaas.com/integracao" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    asaas.com/integracao
                  </a>
                </p>
              </div>

              <Button 
                onClick={handleSavePaymentSettings} 
                className="transition-all hover:scale-105"
                disabled={savePaymentMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {savePaymentMutation.isPending ? 'Salvando...' : 'Salvar Configurações de Pagamento'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Configure integrações com serviços externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">📹 Google Meet</h4>
                    <p className="text-sm text-muted-foreground">Videoconferências integradas</p>
                  </div>
                  <Switch
                    checked={settings.integrations.googleMeet}
                    onCheckedChange={(checked) => updateSetting('integrations', 'googleMeet', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">📅 Google Calendar</h4>
                    <p className="text-sm text-muted-foreground">Sincronização de eventos</p>
                  </div>
                  <Switch
                    checked={settings.integrations.googleCalendar}
                    onCheckedChange={(checked) => updateSetting('integrations', 'googleCalendar', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">💬 WhatsApp</h4>
                    <p className="text-sm text-muted-foreground">Notificações e suporte</p>
                  </div>
                  <Switch
                    checked={settings.integrations.whatsapp}
                    onCheckedChange={(checked) => updateSetting('integrations', 'whatsapp', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">💳 Asaas</h4>
                    <p className="text-sm text-muted-foreground">Processamento de pagamentos (PIX, boleto, cartão)</p>
                  </div>
                  <Switch checked={true} disabled />
                </div>
              </div>
              <Button onClick={() => handleSaveSettings('integrações')} className="transition-all hover:scale-105">
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Landing Page - Hero
              </CardTitle>
              <CardDescription>Textos e chamadas exibidos na página inicial pública</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título Principal</Label>
                <Textarea
                  value={appearanceSettings.hero_title}
                  onChange={e => setAppearanceSettings(prev => ({ ...prev, hero_title: e.target.value }))}
                  rows={2}
                  placeholder="Título do hero da landing page"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Textarea
                  value={appearanceSettings.hero_subtitle}
                  onChange={e => setAppearanceSettings(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                  rows={2}
                  placeholder="Subtítulo do hero"
                />
              </div>
              <div className="space-y-2">
                <Label>Texto do Botão CTA</Label>
                <Input
                  value={appearanceSettings.hero_cta_text}
                  onChange={e => setAppearanceSettings(prev => ({ ...prev, hero_cta_text: e.target.value }))}
                  placeholder="Ex: Agendar PowerTalk Grátis"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Barra de Anúncio
              </CardTitle>
              <CardDescription>Exibida no topo da página para destacar promoções ou avisos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ativar barra de anúncio</Label>
                <Switch
                  checked={!!appearanceSettings.announcement_bar_enabled}
                  onCheckedChange={v => setAppearanceSettings(prev => ({ ...prev, announcement_bar_enabled: v }))}
                />
              </div>
              {appearanceSettings.announcement_bar_enabled && (
                <div className="space-y-2">
                  <Label>Texto do Anúncio</Label>
                  <Input
                    value={appearanceSettings.announcement_bar || ''}
                    onChange={e => setAppearanceSettings(prev => ({ ...prev, announcement_bar: e.target.value }))}
                    placeholder="Ex: 🎉 Vagas abertas! Inscreva-se agora."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores da Marca
              </CardTitle>
              <CardDescription>Cores utilizadas na landing page e nos dashboards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Principal</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={appearanceSettings.primary_color || '#E59313'}
                      onChange={e => setAppearanceSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={appearanceSettings.primary_color || '#E59313'}
                      onChange={e => setAppearanceSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="flex-1 font-mono"
                      placeholder="#E59313"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Escura</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={appearanceSettings.dark_color || '#2B2B2B'}
                      onChange={e => setAppearanceSettings(prev => ({ ...prev, dark_color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={appearanceSettings.dark_color || '#2B2B2B'}
                      onChange={e => setAppearanceSettings(prev => ({ ...prev, dark_color: e.target.value }))}
                      className="flex-1 font-mono"
                      placeholder="#2B2B2B"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Números de Destaque (Stats Bar)
              </CardTitle>
              <CardDescription>Números exibidos na barra de estatísticas da landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Alunos Formados</Label>
                  <Input
                    value={appearanceSettings.stats_students || '500+'}
                    onChange={e => setAppearanceSettings(prev => ({ ...prev, stats_students: e.target.value }))}
                    placeholder="500+"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anos de Experiência</Label>
                  <Input
                    value={appearanceSettings.stats_experience || '10+'}
                    onChange={e => setAppearanceSettings(prev => ({ ...prev, stats_experience: e.target.value }))}
                    placeholder="10+"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Satisfação</Label>
                  <Input
                    value={appearanceSettings.stats_satisfaction || '98%'}
                    onChange={e => setAppearanceSettings(prev => ({ ...prev, stats_satisfaction: e.target.value }))}
                    placeholder="98%"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Contato no Rodapé
              </CardTitle>
              <CardDescription>Informações de contato exibidas na landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    value={appearanceSettings.footer_whatsapp || ''}
                    onChange={e => setAppearanceSettings(prev => ({ ...prev, footer_whatsapp: e.target.value }))}
                    placeholder="(98) 98533-2458"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    value={appearanceSettings.footer_email || ''}
                    onChange={e => setAppearanceSettings(prev => ({ ...prev, footer_email: e.target.value }))}
                    placeholder="befluentschooll@gmail.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => saveAppearanceMutation.mutate(appearanceSettings)}
              disabled={saveAppearanceMutation.isPending}
              className="bg-[#E59313] hover:bg-[#d4850f] text-white"
            >
              {saveAppearanceMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Aparência
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>
                Configurações técnicas e manutenção do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" onClick={handleBackupSystem}>
                  <Download className="mr-2 h-4 w-4" />
                  Fazer Backup Completo
                </Button>
                <Button variant="outline" onClick={handleRestoreSystem}>
                  <Upload className="mr-2 h-4 w-4" />
                  Restaurar Sistema
                </Button>
                <Button variant="outline">
                  <Database className="mr-2 h-4 w-4" />
                  Otimizar Database
                </Button>
                <Button variant="outline">
                  <Key className="mr-2 h-4 w-4" />
                  Regenerar Chaves API
                </Button>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">⚠️ Atenção</h4>
                <p className="text-sm text-yellow-700">
                  As operações avançadas podem afetar o funcionamento do sistema. 
                  Certifique-se de ter um backup antes de prosseguir.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}