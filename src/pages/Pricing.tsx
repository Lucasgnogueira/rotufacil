import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Crown, ExternalLink } from 'lucide-react';
import { PLANS, PlanKey, formatBRL, FREE_LIMITS } from '@/lib/subscription';
import { toast } from 'sonner';

const FEATURES_FREE = [
  `Até ${FREE_LIMITS.maxRecipes} receitas`,
  'Tabela nutricional ANVISA',
  'Rotulagem frontal "ALTO EM"',
  'Alergênicos e glúten',
];

const FEATURES_PRO = [
  'Receitas ilimitadas',
  'Exportação PNG e PDF',
  'Produtos industrializados',
  'Subprodutos (hierarquia)',
  'Suporte prioritário',
];

const Pricing = () => {
  const { user, subscription, subscriptionLoading } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handleCheckout = async (planKey: PlanKey) => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PLANS[planKey].price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Erro ao iniciar checkout: ' + (err.message || ''));
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Erro ao abrir portal: ' + (err.message || ''));
    }
  };

  const isCurrentPlan = (planKey: PlanKey) => subscription.subscribed && subscription.planKey === planKey;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Planos NutriLabel AI</h1>
          <p className="text-muted-foreground">
            Comece grátis. Assine para desbloquear todas as funcionalidades.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Free plan */}
          <Card className={`relative ${!subscription.subscribed ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            {!subscription.subscribed && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Plano atual
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Gratuito</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">R$0</span>
              </div>
              <p className="text-xs text-muted-foreground">Para sempre</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {FEATURES_FREE.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-card-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Paid plans */}
          {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan]) => (
            <Card
              key={key}
              className={`relative ${isCurrentPlan(key) ? 'border-primary ring-2 ring-primary/20' : ''} ${key === 'anual' ? 'border-accent' : ''}`}
            >
              {isCurrentPlan(key) && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  <Crown className="mr-1 h-3 w-3" /> Seu plano
                </Badge>
              )}
              {key === 'anual' && !isCurrentPlan(key) && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                  Melhor valor
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">{formatBRL(plan.amount)}</span>
                  <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {FEATURES_PRO.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-card-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrentPlan(key) ? (
                  <Button variant="outline" className="w-full gap-1" onClick={handleManage}>
                    <ExternalLink className="h-3 w-3" /> Gerenciar assinatura
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(key)}
                    disabled={!!loadingPlan || subscriptionLoading}
                  >
                    {loadingPlan === key ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assinar'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {subscription.subscribed && (
          <div className="mt-6 text-center">
            <Button variant="link" onClick={handleManage} className="gap-1 text-muted-foreground">
              <ExternalLink className="h-3 w-3" /> Gerenciar assinatura no portal Stripe
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Pricing;
