import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, ChevronRight, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { FREE_LIMITS } from '@/lib/subscription';
import { toast } from 'sonner';

interface RecipeRow {
  id: string;
  name: string;
  product_type: 'solid' | 'liquid';
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, subscription, refreshSubscription } = useAuth();
  const [searchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Assinatura realizada com sucesso!');
      refreshSubscription();
    }
  }, [searchParams, refreshSubscription]);

  useEffect(() => {
    if (!user) return;
    const fetchRecipes = async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, product_type, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (!error && data) setRecipes(data);
      setLoading(false);
    };
    fetchRecipes();
  }, [user]);

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const atLimit = !subscription.subscribed && recipes.length >= FREE_LIMITS.maxRecipes;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Receitas</h1>
          {!subscription.subscribed && (
            <p className="text-xs text-muted-foreground">
              {recipes.length}/{FREE_LIMITS.maxRecipes} receitas (plano gratuito) ·{' '}
              <Link to="/pricing" className="text-primary hover:underline">Fazer upgrade</Link>
            </p>
          )}
        </div>
        {atLimit ? (
          <Link to="/pricing">
            <Button className="gap-2">
              <Crown className="h-4 w-4" />
              Fazer upgrade para criar mais
            </Button>
          </Link>
        ) : (
          <Link to="/recipe/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Receita
            </Button>
          </Link>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar receitas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {search ? 'Nenhuma receita encontrada.' : 'Nenhuma receita ainda. Crie sua primeira!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Link key={r.id} to={`/recipe/${r.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-card-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.product_type === 'solid' ? 'Sólido' : 'Líquido'} · Atualizado em {format(new Date(r.updated_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
