import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { user } = useAuth();
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

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Configurações</h1>
      <Card className="max-w-md">
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
    </AppLayout>
  );
};

export default SettingsPage;
