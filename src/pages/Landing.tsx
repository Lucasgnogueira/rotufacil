import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import {
  FileText, Zap, BarChart3, Package, ClipboardCheck, Brain,
  ArrowRight, Check, X, ChevronRight, Search, Shield, Timer, DollarSign,
} from 'lucide-react';
import { PLANS, PlanKey, formatBRL } from '@/lib/subscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

const Landing = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handleCheckout = async (planKey: PlanKey) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth?mode=signup');
      return;
    }
    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PLANS[planKey].price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error('Erro ao iniciar checkout: ' + (err.message || ''));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">RotuFácil</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#beneficios" className="transition-colors hover:text-foreground">Benefícios</a>
            <a href="#precos" className="transition-colors hover:text-foreground">Preços</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground">Entrar</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 lg:pt-24">
        {/* subtle bg decoration */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-accent/5 blur-3xl" />

        <div className="container relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left – copy */}
          <motion.div initial="hidden" animate="visible" variants={fade} custom={0}>
            <Badge variant="secondary" className="mb-5 px-3 py-1 text-xs font-semibold">
              Conforme RDC 429/2020 + IN 75/2020
            </Badge>
            <h1 className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-[3.4rem]">
              A forma mais simples de criar{' '}
              <span className="text-accent">rótulos nutricionais.</span>
            </h1>
            <p className="mb-3 text-lg text-muted-foreground lg:text-xl">
              Gere tabela nutricional, ingredientes e alerta "ALTO EM" automaticamente conforme ANVISA.
            </p>
            <p className="mb-8 text-base text-muted-foreground/80">
              Transforme sua receita em um rótulo nutricional completo em poucos segundos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base font-semibold shadow-lg shadow-accent/20">
                  Gerar meu primeiro rótulo <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline" className="gap-2 text-base">
                  Ver exemplo de rótulo <ChevronRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Right – mock visual */}
          <motion.div initial="hidden" animate="visible" variants={fade} custom={2} id="demo" className="flex justify-center">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              {/* Mini nutrition table mock */}
              <div className="mb-4 rounded-lg border-2 border-foreground bg-card p-4">
                <p className="mb-1 text-lg font-extrabold text-foreground">INFORMAÇÃO NUTRICIONAL</p>
                <p className="mb-2 text-[10px] text-muted-foreground">Porção de 50g (1 unidade)</p>
                <div className="space-y-1 border-t-2 border-foreground pt-2">
                  {[
                    ['Valor energético', '185 kcal', '9%'],
                    ['Carboidratos', '28 g', '9%'],
                    ['Proteínas', '4,2 g', '6%'],
                    ['Gorduras totais', '6,8 g', '12%'],
                    ['Fibra alimentar', '1,1 g', '4%'],
                    ['Sódio', '180 mg', '8%'],
                  ].map(([n, v, p]) => (
                    <div key={n} className="flex justify-between text-[11px] leading-tight text-foreground">
                      <span>{n}</span>
                      <span className="flex gap-3"><span>{v}</span><span className="text-muted-foreground">{p}</span></span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Seals */}
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5">
                  <Search className="h-3.5 w-3.5 text-background" />
                  <span className="text-[10px] font-bold uppercase text-background">Alto em sódio</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5">
                  <Search className="h-3.5 w-3.5 text-background" />
                  <span className="text-[10px] font-bold uppercase text-background">Alto em gordura sat.</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section id="como-funciona" className="border-t border-border bg-secondary/40 px-4 py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}
            className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            Crie seu rótulo em 3 passos
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}
            className="mx-auto mb-12 max-w-lg text-muted-foreground">
            Sem planilhas, sem complicação. Resultado profissional em minutos.
          </motion.p>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '01', icon: ClipboardCheck, title: 'Digite sua receita', desc: 'Adicione ingredientes e quantidades. O sistema reconhece automaticamente.' },
              { step: '02', icon: Brain, title: 'Cálculo automático', desc: 'O sistema calcula automaticamente os valores nutricionais com base TACO + IBGE.' },
              { step: '03', icon: Package, title: 'Baixe o rótulo', desc: 'Baixe sua tabela nutricional pronta para usar em embalagens e documentos.' },
            ].map((s, i) => (
              <motion.div key={s.step} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}
                className="relative rounded-xl border border-border bg-card p-8 text-center shadow-sm">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-lg">
                  {s.step}
                </span>
                <s.icon className="mx-auto mb-3 h-7 w-7 text-primary" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFÍCIOS ─── */}
      <section id="beneficios" className="px-4 py-20">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}
            className="mb-3 text-center text-3xl font-bold text-foreground md:text-4xl">
            Feito para quem trabalha com alimentos
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}
            className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
            Restaurantes, food service, indústria e empreendedores de alimentos.
          </motion.p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: 'Muito mais rápido que planilhas', desc: 'Automatize o que antes levava horas. Resultado imediato.' },
              { icon: BarChart3, title: 'Base nutricional TACO + IBGE', desc: 'Dados confiáveis e atualizados do Brasil.' },
              { icon: Package, title: 'Exportação pronta para embalagem', desc: 'PNG em alta resolução e texto formatado.' },
              { icon: Shield, title: 'Conforme normas da ANVISA', desc: 'RDC 429/2020 e IN 75/2020 aplicadas automaticamente.' },
              { icon: Brain, title: 'IA que entende sua receita', desc: 'Interpretação inteligente de ingredientes e quantidades.' },
              { icon: FileText, title: 'Tudo em um lugar', desc: 'Tabela, ingredientes, alergênicos e selos em uma única tela.' },
            ].map((b, i) => (
              <motion.div key={b.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}
                className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-semibold text-foreground">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROVA DE VALOR ─── */}
      <section className="border-t border-border bg-secondary/40 px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}
            className="mb-3 text-center text-3xl font-bold text-foreground md:text-4xl">
            Economize tempo e dinheiro
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}
            className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
            Sem precisar pagar nutricionista por cada receita, gere seus rótulos nutricionais em minutos.
          </motion.p>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={2}
            className="grid gap-6 md:grid-cols-2">
            {/* Traditional */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-bold text-foreground">Método tradicional</h3>
                <ul className="space-y-3">
                  {['Demorado — dias ou semanas', 'Caro — R$150+ por receita', 'Manual — sujeito a erros', 'Dependente de terceiros'].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            {/* RotuFácil */}
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-bold text-foreground">Com RotuFácil</h3>
                <ul className="space-y-3">
                  {['Automático — resultados em segundos', 'Econômico — a partir de R$9,75/mês', 'Preciso — base TACO + IBGE', 'Independente — faça você mesmo'].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="precos" className="px-4 py-20">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}
            className="mb-3 text-center text-3xl font-bold text-foreground md:text-4xl">
            Planos e preços
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}
            className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
            Comece gratuitamente. Assine para criar receitas ilimitadas e exportar.
          </motion.p>

          <div className="grid gap-6 md:grid-cols-3">
            {([
              { key: 'mensal' as PlanKey, discount: null },
              { key: 'semestral' as PlanKey, discount: 'Economize 18%' },
              { key: 'anual' as PlanKey, discount: 'Economize 76%' },
            ]).map(({ key, discount }, i) => {
              const plan = PLANS[key];
              const isBest = key === 'anual';
              return (
                <motion.div key={key} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}>
                  <Card className={`relative h-full ${isBest ? 'border-accent ring-2 ring-accent/20 scale-[1.03]' : ''}`}>
                    {isBest && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 text-xs font-bold">
                        MAIS ECONÔMICO
                      </Badge>
                    )}
                    {discount && !isBest && (
                      <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold">
                        {discount}
                      </Badge>
                    )}
                    <CardContent className="flex flex-col items-center p-8 text-center">
                      <h3 className="mb-1 text-lg font-bold text-foreground">{plan.name}</h3>
                      <p className="mb-4 text-xs text-muted-foreground">{plan.description}</p>
                      <div className="mb-6">
                        <span className="text-4xl font-extrabold text-foreground">{formatBRL(plan.amount)}</span>
                        <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                      </div>
                      <ul className="mb-6 w-full space-y-2 text-left">
                        {['Receitas ilimitadas', 'Exportação PNG e PDF', 'Tabela + selos ALTO EM', 'Subprodutos e industrializados', 'Suporte prioritário'].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 shrink-0 text-accent" /> {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full gap-2 font-semibold ${isBest ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20' : ''}`}
                        onClick={() => handleCheckout(key)}
                        disabled={!!loadingPlan}
                      >
                        {loadingPlan === key ? 'Aguarde…' : 'Começar agora'}
                        {loadingPlan !== key && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="border-t border-border bg-secondary/40 px-4 py-20">
        <div className="container mx-auto max-w-2xl">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}
            className="mb-10 text-center text-3xl font-bold text-foreground md:text-4xl">
            Perguntas frequentes
          </motion.h2>

          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: 'Preciso ser nutricionista para usar?', a: 'Não. O RotuFácil foi criado para qualquer pessoa que trabalhe com alimentos. A ferramenta gera o rótulo automaticamente com base nos dados inseridos. Para fins regulatórios finais, recomenda-se validação por profissional habilitado.' },
              { q: 'O rótulo segue as normas da ANVISA?', a: 'Sim. Todos os cálculos e layouts seguem a RDC 429/2020 e a IN 75/2020, incluindo rotulagem frontal "ALTO EM".' },
              { q: 'Posso exportar a tabela nutricional?', a: 'Sim. Nos planos pagos você pode exportar a tabela nutricional e os selos em PNG de alta resolução, prontos para uso em embalagens.' },
              { q: 'O sistema funciona para qualquer receita?', a: 'O sistema trabalha com a base TACO + IBGE e permite adicionar produtos industrializados. Qualquer receita com ingredientes cadastrados pode ser calculada.' },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-lg border border-border bg-card px-4">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="px-4 py-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}
          className="container mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Comece agora a criar rótulos nutricionais em segundos
          </h2>
          <p className="mb-8 text-muted-foreground">Leva menos de 1 minuto.</p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base font-semibold shadow-lg shadow-accent/20 px-10">
              Criar minha conta <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-card px-4 py-8">
        <div className="container mx-auto flex flex-col items-center gap-4 text-center text-sm text-muted-foreground md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} RotuFácil. Todos os direitos reservados.</span>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-foreground">Termos</a>
            <a href="#" className="transition-colors hover:text-foreground">Privacidade</a>
            <a href="#" className="transition-colors hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
