import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Calendar, DollarSign, Download, Receipt, AlertTriangle, CheckCircle, Clock, Loader2, QrCode, FileText, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function PaymentSystem({ userRole = 'student', userProfile }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('PIX');
  const [clientSecret, setClientSecret] = useState('');
  const [pixData, setPixData] = useState(null);
  const [boletoData, setBoletoData] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cpfCnpj, setCpfCnpj] = useState('');

  const { data: subscriptionData, isLoading: subscriptionLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['/api/my-subscription'],
    queryFn: async () => {
      const response = await fetch('/api/my-subscription', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch subscription');
      return response.json();
    },
  });

  const { data: paymentConfig } = useQuery({
    queryKey: ['/api/payment-config'],
    queryFn: async () => {
      const response = await fetch('/api/payment-config', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return { asaasEnabled: false };
      return response.json();
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/my-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar assinatura');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Assinatura Criada!",
        description: "Sua assinatura foi criada com sucesso. Aguarde a primeira cobrança.",
      });
      setIsSubscriptionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/auth/profile'] });
    },
    onError: (error) => {
      toast({
        title: "Erro na Criação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchPixQrCode = async (paymentId) => {
    try {
      const response = await fetch(`/api/my-payments/${paymentId}/pix`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setPixData(data);
      }
    } catch (error) {
      console.error('Error fetching PIX QR code:', error);
    }
  };

  const fetchBoletoData = async (paymentId) => {
    try {
      const response = await fetch(`/api/my-payments/${paymentId}/boleto`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setBoletoData(data);
      }
    } catch (error) {
      console.error('Error fetching boleto:', error);
    }
  };

  const formatCurrency = (amount) => {
    const value = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    if (value > 1000) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = typeof dateString === 'number' 
      ? new Date(dateString * 1000) 
      : new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      ACTIVE: { label: 'Ativa', color: 'bg-green-500' },
      INACTIVE: { label: 'Inativa', color: 'bg-gray-500' },
      PENDING: { label: 'Pendente', color: 'bg-yellow-500' },
      OVERDUE: { label: 'Vencida', color: 'bg-red-500' },
      RECEIVED: { label: 'Pago', color: 'bg-green-500' },
      CONFIRMED: { label: 'Confirmado', color: 'bg-green-500' },
      RECEIVED_IN_CASH: { label: 'Pago', color: 'bg-green-500' },
      active: { label: 'Ativa', color: 'bg-green-500' },
      past_due: { label: 'Vencida', color: 'bg-yellow-500' },
      canceled: { label: 'Cancelada', color: 'bg-red-500' },
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-500' };
    return <Badge className={`text-white ${statusInfo.color}`}>{statusInfo.label}</Badge>;
  };

  const getBillingTypeLabel = (type) => {
    const types = {
      PIX: 'PIX',
      BOLETO: 'Boleto',
      CREDIT_CARD: 'Cartão de Crédito',
      UNDEFINED: 'A Definir'
    };
    return types[type] || type;
  };

  const handleStartSubscription = () => {
    if (paymentConfig?.asaasEnabled) {
      setIsSubscriptionModalOpen(true);
    } else {
      toast({
        title: "Sistema Indisponível",
        description: "O sistema de pagamento não está configurado. Entre em contato com o suporte.",
        variant: "destructive",
      });
    }
  };

  const handleCreateAsaasSubscription = () => {
    if (!cpfCnpj && !userProfile?.cpf) {
      toast({
        title: "CPF Obrigatório",
        description: "Por favor, informe seu CPF para criar a assinatura.",
        variant: "destructive",
      });
      return;
    }

    createSubscriptionMutation.mutate({
      billingType: selectedPaymentMethod,
      cycle: 'MONTHLY',
      cpfCnpj: cpfCnpj || userProfile?.cpf
    });
  };

  const handlePaymentClick = async (payment) => {
    setSelectedPayment(payment);
    setPixData(null);
    setBoletoData(null);

    if (payment.billingType === 'PIX' || payment.billingType === 'UNDEFINED') {
      await fetchPixQrCode(payment.id);
    }
    if (payment.billingType === 'BOLETO' || payment.billingType === 'UNDEFINED') {
      await fetchBoletoData(payment.id);
    }
    setIsPaymentModalOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
  };

  const subscription = subscriptionData?.subscription;
  const charges = subscriptionData?.charges || [];
  const hasActiveSubscription = subscription?.status === 'ACTIVE' || subscription?.status === 'active';
  const monthlyFee = subscriptionData?.monthlyFee || userProfile?.monthly_fee || 35000;
  const pendingCharges = charges.filter(c => c.status === 'PENDING' || c.status === 'OVERDUE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="db-panel-title" style={{ fontSize: 18 }}>Pagamentos</div>
          <div className="db-panel-sub">Be Fluent School — mensalidade</div>
        </div>
        {!hasActiveSubscription && (
          <button className="db-cta" onClick={handleStartSubscription} disabled={createSubscriptionMutation.isPending} style={{ gap: 6 }}>
            {createSubscriptionMutation.isPending
              ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
              : <DollarSign style={{ width: 13, height: 13 }} />}
            Iniciar Assinatura
          </button>
        )}
      </div>

      {/* Status da assinatura */}
      <div className="db-panel da1">
        <div className="db-panel-inner">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="db-panel-title">Status da Assinatura</div>
              <div className="db-panel-sub">Mensalidade Be Fluent School</div>
            </div>
            {hasActiveSubscription && getStatusBadge(subscription.status)}
          </div>

          {subscriptionLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Loader2 style={{ width: 16, height: 16, color: '#E59313' }} className="animate-spin" />
            </div>
          ) : hasActiveSubscription ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 600, color: '#22c55e' }}>
                {formatCurrency(subscription.value || monthlyFee)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Próx. vencimento', value: formatDate(subscription.nextDueDate) },
                  { label: 'Forma de pagamento', value: getBillingTypeLabel(subscription.billingType) },
                  { label: 'Ciclo', value: subscription.cycle === 'MONTHLY' ? 'Mensal' : subscription.cycle },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', color: '#42424a', letterSpacing: '0.07em', marginBottom: 4 }}>{label.toUpperCase()}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#eeeef0' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <AlertTriangle style={{ width: 28, height: 28, color: '#eab308' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#eeeef0' }}>Nenhuma assinatura ativa</p>
              <p style={{ fontSize: 12, color: '#86868e' }}>Ative sua assinatura para continuar tendo acesso às aulas.</p>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: '#E59313' }}>{formatCurrency(monthlyFee)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cobranças */}
      {charges.length > 0 && (
        <div className="db-panel da2">
          <div className="db-panel-inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="db-panel-title">Suas Cobranças</div>
                <div className="db-panel-sub">Histórico e pagamentos pendentes</div>
              </div>
              {pendingCharges.length > 0 && (
                <span className="db-pill red" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
                  {pendingCharges.length} pendente{pendingCharges.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {charges.map((charge) => {
                const isPending = charge.status === 'PENDING' || charge.status === 'OVERDUE';
                const accentColor = isPending ? (charge.status === 'OVERDUE' ? '#ef4444' : '#eab308') : '#22c55e';
                return (
                  <div key={charge.id} className="db-row" style={{
                    padding: '10px 12px',
                    background: accentColor + '07',
                    borderLeft: `2px solid ${accentColor}30`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div className="db-icon" style={{ width: 30, height: 30, background: accentColor + '12', borderColor: accentColor + '25', color: accentColor, flexShrink: 0 }}>
                        {isPending ? <Clock style={{ width: 12, height: 12 }} /> : <CheckCircle style={{ width: 12, height: 12 }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 500, color: '#eeeef0', lineHeight: 1.2 }}>{charge.description || 'Mensalidade'}</p>
                        <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>Vencimento: {formatDate(charge.dueDate)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: accentColor }}>{formatCurrency(charge.value)}</span>
                      {isPending && (
                        <button className="db-cta" onClick={() => handlePaymentClick(charge)} style={{ fontSize: 11, padding: '5px 11px' }}>
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Métodos aceitos */}
      <div className="db-panel da3">
        <div className="db-panel-inner">
          <div className="db-panel-title" style={{ marginBottom: 14 }}>Métodos de Pagamento</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { icon: QrCode, label: 'PIX', sub: 'Instantâneo', color: '#22c55e' },
              { icon: FileText, label: 'Boleto', sub: '3 dias úteis', color: '#E59313' },
              { icon: CreditCard, label: 'Cartão', sub: 'Visa, Master, Elo', color: '#3b82f6' },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: color + '06', border: `1px solid ${color}18` }}>
                <div className="db-icon" style={{ width: 32, height: 32, background: color + '12', borderColor: color + '22', color, flexShrink: 0 }}>
                  <Icon style={{ width: 13, height: 13 }} />
                </div>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#eeeef0', lineHeight: 1.2 }}>{label}</p>
                  <p style={{ fontSize: 10, color: '#42424a', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <p style={{ fontSize: 11.5, color: '#86868e' }}>
              <span style={{ color: '#3b82f6', fontWeight: 600 }}>Dica:</span> PIX é processado imediatamente. Boletos compensam em até 3 dias úteis.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Assinatura</DialogTitle>
            <DialogDescription>
              Escolha como deseja pagar sua mensalidade de {formatCurrency(monthlyFee)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!userProfile?.cpf && (
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      PIX - Pagamento instantâneo
                    </div>
                  </SelectItem>
                  <SelectItem value="BOLETO">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Boleto Bancário
                    </div>
                  </SelectItem>
                  <SelectItem value="UNDEFINED">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Escolher a cada mês
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscriptionModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAsaasSubscription}
              disabled={createSubscriptionMutation.isPending}
            >
              {createSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Confirmar Assinatura'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pagar Cobrança</DialogTitle>
            <DialogDescription>
              {selectedPayment && `Valor: ${formatCurrency(selectedPayment.value)} - Vencimento: ${formatDate(selectedPayment.dueDate)}`}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="pix" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pix" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="boleto" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Boleto
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pix" className="space-y-4">
              {pixData ? (
                <div className="text-center space-y-4">
                  {pixData.encodedImage && (
                    <img 
                      src={`data:image/png;base64,${pixData.encodedImage}`} 
                      alt="QR Code PIX" 
                      className="mx-auto w-48 h-48"
                    />
                  )}
                  {pixData.payload && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Código PIX Copia e Cola:</p>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={pixData.payload} 
                          readOnly 
                          className="text-xs"
                        />
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => copyToClipboard(pixData.payload)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {pixData.expirationDate && (
                    <p className="text-sm text-muted-foreground">
                      Expira em: {formatDate(pixData.expirationDate)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Carregando QR Code...</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="boleto" className="space-y-4">
              {boletoData || selectedPayment?.bankSlipUrl ? (
                <div className="space-y-4">
                  {(boletoData?.barCode || boletoData?.identificationField) && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Linha Digitável:</p>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={boletoData.identificationField || boletoData.barCode} 
                          readOnly 
                          className="text-xs font-mono"
                        />
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => copyToClipboard(boletoData.identificationField || boletoData.barCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {selectedPayment?.bankSlipUrl && (
                    <Button 
                      className="w-full" 
                      onClick={() => window.open(selectedPayment.bankSlipUrl, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visualizar Boleto PDF
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Carregando boleto...</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
