import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, ExternalLink } from 'lucide-react';
import { PLANS } from '@/lib/subscription';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { user, subscription } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('g');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('company_name, default_serving_unit')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCompanyName(data.company_name || '');
          setDefaultUnit(data.default_serving_unit || 'g');
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ company_name: companyName, default_serving_unit: defaultUnit })
      .eq('user_id', user.id);
    if (error) toast.error('Erro ao salvar');
    else toast.success('Configurações salvas');
    setLoading(false);
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error('Erro ao abrir portal: ' + (err.message || ''));
    }
  };

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Configurações</h1>
      
      <div className="mx-auto max-w-md space-y-6">
        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-4 w-4" /> Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.subscribed ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">
                    {subscription.planKey ? PLANS[subscription.planKey].name : 'Pro'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Ativa</span>
                </div>
                {subscription.subscriptionEnd && (
                  <p className="text-xs text-muted-foreground">
                    Renova em: {new Date(subscription.subscriptionEnd).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={handleManageSubscription} className="gap-1">
                  <ExternalLink className="h-3 w-3" /> Gerenciar assinatura
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Plano gratuito</p>
                <Link to="/pricing">
                  <Button size="sm" className="gap-1">
                    <Crown className="h-3 w-3" /> Fazer upgrade
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Nome da empresa (opcional)</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Sua empresa" />
            </div>
            <div className="space-y-2">
              <Label>Unidade padrão de exibição</Label>
              <select
                value={defaultUnit}
                onChange={e => setDefaultUnit(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="g">Gramas (g)</option>
                <option value="ml">Mililitros (ml)</option>
              </select>
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
