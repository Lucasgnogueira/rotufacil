import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { FileText, Plus, List, Settings, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: List, label: 'Receitas' },
  { href: '/recipe/new', icon: Plus, label: 'Nova Receita' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">NutriLabel AI</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-1.5"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-border bg-muted px-4 py-4">
        <p className="text-center text-xs text-muted-foreground">
          Resultados estimados com base em bases de composição e dados inseridos. Para fins regulatórios finais, recomenda-se validação técnica.
        </p>
      </footer>
    </div>
  );
}
