import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, FileText, Shield, Download } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">NutriLabel AI</span>
          </div>
          <div className="flex gap-3">
            <Link to="/auth">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-primary px-4 py-20">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-primary-foreground md:text-5xl">
            Rotulagem nutricional
            <br />
            <span className="opacity-80">conforme ANVISA em minutos</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-primary-foreground/80">
            Cole sua receita, receba a tabela nutricional, lista de ingredientes, alergênicos e selos "ALTO EM" — tudo pronto para impressão, conforme RDC 429/2020 e IN 75/2020.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" variant="secondary" className="text-base font-semibold">
              Começar gratuitamente →
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                icon: FileText,
                title: 'Tabela nutricional completa',
                desc: 'Valores por porção e por 100g/100ml, com %VD, layout padrão ANVISA pronto para imprimir.',
              },
              {
                icon: Search,
                title: 'Rotulagem frontal "ALTO EM"',
                desc: 'Verificação automática de açúcares adicionados, gordura saturada e sódio. Selos em PNG.',
              },
              {
                icon: Shield,
                title: 'Alergênicos e glúten',
                desc: 'Detecção automática de alérgenos, declaração "CONTÉM/NÃO CONTÉM GLÚTEN" e lactose opcional.',
              },
              {
                icon: Download,
                title: 'Exportação em PNG',
                desc: 'Tabela e selos em alta resolução para uso em rótulos. Versão texto para copiar e colar.',
              },
            ].map((f, i) => (
              <div key={i} className="animate-fade-in rounded-lg border border-border bg-card p-6 shadow-sm">
                <f.icon className="mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-border bg-muted px-4 py-8">
        <div className="container mx-auto max-w-2xl text-center">
          <p className="text-xs text-muted-foreground">
            Resultados estimados com base em bases de composição e dados inseridos. Para fins regulatórios finais, recomenda-se validação técnica por profissional habilitado. NutriLabel AI não substitui análise laboratorial.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} NutriLabel AI. Base normativa: RDC 429/2020 + IN 75/2020.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
