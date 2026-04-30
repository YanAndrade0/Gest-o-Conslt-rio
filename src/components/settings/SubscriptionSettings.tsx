import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase-config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, CreditCard, Clock, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionData {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'none';
  currentPeriodEnd?: any;
  planName?: string;
}

export function SubscriptionSettings() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData>({ status: 'none' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      toast.success('Parabéns! Sua assinatura foi processada e será ativada em instantes.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('canceled')) {
      toast.error('O processo de assinatura foi cancelado.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchSubscription = async () => {
      if (!user?.clinicId) return;
      try {
        const docRef = doc(db, 'clinics', user.clinicId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.subscription) {
            setSubscription(data.subscription);
          } else {
            // Default to trial if new? Or just none
            setSubscription({ status: 'trialing', planName: 'Período de Teste' });
          }
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, [user?.clinicId]);

  const handleSubscribe = async (priceId: string) => {
    if (!user || !user.clinicId) {
      toast.error('Usuário não identificado.');
      return;
    }
    
    const rawPriceId = String(priceId || '').trim().replace(/['"]/g, '');
    
    if (!rawPriceId || rawPriceId === 'VITE_STRIPE_MONTHLY_PRICE_ID' || rawPriceId === 'VITE_STRIPE_YEARLY_PRICE_ID' || rawPriceId === '') {
      console.error('Subscription blocked: Missing Price ID');
      toast.error('Configuração do Stripe Ausente', {
        description: 'Vá no menu Settings (engrenagem) no topo e preencha os IDs dos planos (price_...).',
        duration: 10000
      });
      return;
    }

    if (rawPriceId.startsWith('prod_')) {
      console.error('Subscription blocked: Product ID used instead of Price ID');
      toast.error('ID de Produto Detectado', {
        description: 'Você colou o ID do produto (prod_...), mas o Stripe exige o ID do PREÇO (price_...). Procure pelo "API ID" na seção de preços do seu produto no Stripe.',
        duration: 12000
      });
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Preparando seu checkout...');

    try {
      console.log('Iniciando checkout com priceId final:', rawPriceId);
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: user.clinicId,
          customerEmail: user.email,
          priceId: rawPriceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro no servidor de checkout');
      }

      if (data.url) {
        console.log('Redirecionando para:', data.url);
        toast.success('Redirecionando para o Stripe...', { id: toastId });
        
        // Abrir em nova aba evita bloqueios de iFrame
        const checkoutWindow = window.open(data.url, '_blank');
        if (!checkoutWindow) {
          window.location.assign(data.url);
        }
      } else {
        throw new Error('URL de checkout não retornada pelo servidor.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Erro no Checkout', {
        id: toastId,
        description: error.message || 'Verifique sua conexão e o ID no menu Settings.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse font-bold text-slate-400">Carregando dados da assinatura...</div>;
  }

  const handlePortal = async () => {
    if (!user?.clinicId) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: user.clinicId }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Erro ao abrir portal de faturamento.');
      }
    } catch (error) {
      toast.error('Erro de conexão.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = () => {
    switch (subscription.status) {
      case 'active': return 'text-green-500 bg-green-50 border-green-100';
      case 'trialing': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'past_due':
      case 'unpaid': return 'text-orange-500 bg-orange-50 border-orange-100';
      case 'canceled': return 'text-red-500 bg-red-50 border-red-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const getStatusLabel = () => {
    switch (subscription.status) {
      case 'active': return 'Assinatura Ativa';
      case 'trialing': return 'Período de Demonstração';
      case 'past_due': return 'Pagamento Pendente';
      case 'canceled': return 'Assinatura Cancelada';
      default: return 'Sem Plano Ativo';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-slate-400" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Plano Atual</h3>
        </div>
        
        <Card className="card-custom border-none overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor()}`}>
                  {subscription.status === 'active' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {getStatusLabel()}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-800">{subscription.planName || 'Gestão Profissional'}</h4>
                  {subscription.currentPeriodEnd && (
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      {subscription.status === 'active' ? 'Renovação em' : 'Expira em'}: {' '}
                      <span className="font-bold text-slate-700">
                        {format(subscription.currentPeriodEnd.toDate ? subscription.currentPeriodEnd.toDate() : new Date(subscription.currentPeriodEnd), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {subscription.status === 'active' ? (
                <Button 
                  onClick={handlePortal}
                  disabled={isProcessing}
                  variant="outline"
                  className="h-12 border-slate-200 rounded-xl font-bold flex items-center gap-2 hover:border-brand-primary"
                >
                  <CreditCard size={16} />
                  Gerenciar Faturamento
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-brand-primary" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Nossos Planos</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card className="card-custom border-none flex flex-col h-full bg-white transition-all hover:scale-[1.01] hover:shadow-2xl">
            <CardHeader className="p-8 pb-0">
              <div className="px-3 py-1 bg-brand-light rounded-lg w-fit mb-4">
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Mais Popular</span>
              </div>
              <CardTitle className="text-2xl font-black text-slate-800">Plano Mensal</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Controle total imediato</CardDescription>
            </CardHeader>
            <CardContent className="p-8 flex-1 flex flex-col gap-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-800 tracking-tight">R$ 34,90</span>
                <span className="text-lg font-bold text-slate-400">/mês</span>
              </div>
              
              <ul className="space-y-3 flex-1">
                {['Até 5 usuários por clínica', 'Pacientes Ilimitados', 'Agenda Multiclínica', 'Financeiro Completo', 'Suporte WhatsApp', 'Backup em Tempo Real'].map(feat => (
                  <li key={feat} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <CheckCircle2 size={16} className="text-green-500" /> {feat}
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handleSubscribe(import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID)}
                disabled={isProcessing || subscription.status === 'active'}
                className="w-full h-14 bg-brand-primary text-white rounded-2xl font-black shadow-lg shadow-brand-primary/20 hover:bg-brand-accent transition-all group"
              >
                {isProcessing ? 'Processando...' : (subscription.status === 'active' ? 'Assinatura Ativa' : 'Assinar Mensal')}
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="card-custom border-2 border-brand-primary/20 flex flex-col h-full bg-slate-50 shadow-none">
            <CardHeader className="p-8 pb-0">
              <div className="px-3 py-1 bg-green-100 rounded-lg w-fit mb-4">
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Economize 14%</span>
              </div>
              <CardTitle className="text-2xl font-black text-slate-800">Plano Anual</CardTitle>
              <CardDescription className="text-slate-500 font-medium tracking-tight">Foco no crescimento</CardDescription>
            </CardHeader>
            <CardContent className="p-8 flex-1 flex flex-col gap-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-800 tracking-tight">R$ 359,90</span>
                <span className="text-lg font-bold text-slate-400">/ano</span>
              </div>
              
              <ul className="space-y-3 flex-1 opacity-70">
                {['Até 5 usuários por clínica', 'Todos os recursos Mensal', '2 meses de desconto', 'Faturamento anual por CNPJ', 'Gerente de Contas'].map(feat => (
                  <li key={feat} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <CheckCircle2 size={16} className="text-green-500" /> {feat}
                  </li>
                ))}
              </ul>

              <Button 
                variant="outline"
                onClick={() => handleSubscribe(import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID)}
                disabled={isProcessing || subscription.status === 'active'}
                className="w-full h-14 border-2 border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-white hover:border-brand-primary transition-all group"
              >
                {isProcessing ? 'Processando...' : 'Assinar Anual'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/20 blur-[100px] -translate-y-32 translate-x-32 group-hover:bg-brand-primary/30 transition-all duration-700"></div>
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h4 className="text-2xl font-black tracking-tight">Precisa de Ajuda?</h4>
            <p className="text-slate-400 font-medium leading-relaxed max-w-md">Nosso suporte está disponível para tirar dúvidas sobre faturamento e recursos avançados.</p>
          </div>
          <Button className="bg-white text-slate-900 font-black px-8 h-14 rounded-2xl hover:bg-brand-primary hover:text-white transition-all shadow-2xl shadow-black/20">
            Falar com Suporte
          </Button>
        </div>
      </section>
    </div>
  );
}
