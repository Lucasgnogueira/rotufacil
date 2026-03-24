import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { NutritionLabel } from '@/components/NutritionLabel';
import { FrontWarningSeals } from '@/components/FrontWarningSeals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Copy, Clock, Calculator, Loader2, FileText, Eye } from 'lucide-react';
import { ExportButtons } from '@/components/ExportButtons';
import { exportLabelPdf } from '@/lib/export-service';
import { NutritionTableExportStage, FrontWarningExportStage } from '@/components/export/NutritionExportStage';
import { toast } from 'sonner';
import {
  computeNutrition,
  checkFrontWarning,
  generateIngredientsList,
  generateAllergenDeclarations,
  NutritionResult,
  FrontWarning,
  RecipeItem,
  NutrientsPer100,
} from '@/lib/nutrition-engine';
import { format } from 'date-fns';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [result, setResult] = useState<NutritionResult | null>(null);
  const [warnings, setWarnings] = useState<FrontWarning | null>(null);
  const [ingredientsList, setIngredientsList] = useState('');
  const [allergenDecl, setAllergenDecl] = useState('');
  const [versions, setVersions] = useState<any[]>([]);
  const [computing, setComputing] = useState(false);
  const [latestVersionId, setLatestVersionId] = useState<string | null>(null);
  const [includeLactose, setIncludeLactose] = useState(false);
  const [includeTraces, setIncludeTraces] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const exportTableRef = useRef<HTMLDivElement>(null);
  const exportSealsRef = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: r } = await supabase.from('recipes').select('*').eq('id', id).single();
      if (!r) {
        navigate('/dashboard');
        return;
      }
      setRecipe(r);

      const { data: ri } = await supabase
        .from('recipe_items')
        .select('*, ingredients(*)')
        .eq('recipe_id', id)
        .order('sort_order');
      if (ri) setItems(ri);

      const { data: v } = await supabase
        .from('recipe_versions')
        .select('*')
        .eq('recipe_id', id)
        .order('version_number', { ascending: false });

      if (v) {
        setVersions(v);

        const latestVersion = v[0];
        if (latestVersion) {
          setLatestVersionId(latestVersion.id ?? null);
          setResult((latestVersion.results_snapshot ?? null) as unknown as NutritionResult | null);
          setWarnings((latestVersion.front_warning_flags ?? null) as unknown as FrontWarning | null);
          setIngredientsList(latestVersion.ingredients_list ?? '');
          setAllergenDecl(latestVersion.allergen_declarations ?? '');
        }
      }
    };
    load();
  }, [id, navigate]);

  const waitForPrintLayout = async () => {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore font readiness errors and continue validation below
      }
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 120);
    });
  };

  const ensurePrintAreaReady = async (activatePreview = false) => {
    if (!result) {
      toast.error('Calcule a receita primeiro.');
      return null;
    }

    if (activatePreview) {
      setShowPrintPreview(true);
    }

    await waitForPrintLayout();

    const node = printContainerRef.current;
    if (!node) {
      toast.error('Área de impressão não encontrada.');
      return null;
    }

    const rect = node.getBoundingClientRect();
    const hasContent = Boolean(node.textContent?.trim());

    if (rect.width <= 0 || rect.height <= 0 || !hasContent) {
      toast.error('A tabela de impressão não está pronta para exportar.');
      return null;
    }

    return node;
  };

  const handlePreviewPrintArea = async () => {
    if (showPrintPreview) {
      setShowPrintPreview(false);
      return;
    }

    const node = await ensurePrintAreaReady(true);
    if (!node) {
      setShowPrintPreview(false);
      return;
    }

    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast.success('Pré-visualização pronta.');
  };

  const handlePrintPdf = async () => {
    const node = await ensurePrintAreaReady(true);
    if (!node) {
      setShowPrintPreview(false);
      return;
    }

    try {
      toast.info('Gerando PDF...');
      const blob = await exportLabelPdf(node);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recipe?.name || 'rotulo'}_tabela.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF baixado!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar PDF.');
    }
  };

  const compute = async () => {
    if (!recipe || items.length === 0) return;
    setComputing(true);

    const recipeItems: RecipeItem[] = items.map((ri: any) => {
      const ing = ri.ingredients;
      const n = (ing.nutrients_per_100 || {}) as NutrientsPer100;
      return {
        ingredient_name: ing.name,
        qty_in_grams_ml: ri.qty_in_grams_ml || ri.qty,
        nutrients_per_100: {
          kcal: n.kcal || 0,
          kj: n.kj || 0,
          carbs_g: n.carbs_g || 0,
          sugars_total_g: n.sugars_total_g || 0,
          sugars_added_g: n.sugars_added_g || 0,
          protein_g: n.protein_g || 0,
          fat_total_g: n.fat_total_g || 0,
          sat_fat_g: n.sat_fat_g || 0,
          trans_fat_g: n.trans_fat_g || 0,
          fiber_g: n.fiber_g || 0,
          sodium_mg: n.sodium_mg || 0,
        },
        is_allergen_milk: ing.is_allergen_milk || false,
        is_allergen_egg: ing.is_allergen_egg || false,
        is_allergen_wheat: ing.is_allergen_wheat || false,
        is_allergen_soy: ing.is_allergen_soy || false,
        is_allergen_peanut: ing.is_allergen_peanut || false,
        is_allergen_tree_nuts: ing.is_allergen_tree_nuts || false,
        is_allergen_fish: ing.is_allergen_fish || false,
        is_allergen_crustaceans: ing.is_allergen_crustaceans || false,
        contains_gluten: ing.contains_gluten || false,
        contains_lactose: ing.contains_lactose || false,
      };
    });

    const nutritionResult = computeNutrition(
      recipeItems,
      recipe.yield_total_g_ml,
      recipe.serving_size_g_ml,
      recipe.household_measure_text || '1 porção',
      recipe.product_type,
      recipe.cooking_loss_pct || 0,
    );

    const frontWarnings = checkFrontWarning(recipe.product_type, nutritionResult.per_100);
    const ingList = generateIngredientsList(
      recipeItems.map((i) => ({
        ingredient_name: i.ingredient_name,
        qty_in_grams_ml: i.qty_in_grams_ml,
      })),
    );
    const allergens = generateAllergenDeclarations(recipeItems, includeTraces, includeLactose);

    setResult(nutritionResult);
    setWarnings(frontWarnings);
    setIngredientsList(ingList);
    setAllergenDecl(allergens);

    const versionNum = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) + 1 : 1;
    const { error } = await supabase.from('recipe_versions').insert({
      recipe_id: id!,
      version_number: versionNum,
      inputs_snapshot: { items: items.map((i: any) => ({ ingredient: i.ingredients?.name, qty: i.qty, unit: i.unit })) },
      results_snapshot: nutritionResult as any,
      front_warning_flags: frontWarnings as any,
      ingredients_list: ingList,
      allergen_declarations: allergens,
    });

    if (!error) {
      const { data: v } = await supabase
        .from('recipe_versions')
        .select('*')
        .eq('recipe_id', id!)
        .order('version_number', { ascending: false });
      if (v) {
        setVersions(v);
        setLatestVersionId(v[0]?.id ?? null);
      }
    }

    setComputing(false);
    toast.success('Cálculo concluído e versão salva!');
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const duplicateRecipe = async () => {
    if (!recipe || !user) return;
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        owner_user_id: user.id,
        name: `${recipe.name} (cópia)`,
        product_type: recipe.product_type,
        yield_total_g_ml: recipe.yield_total_g_ml,
        serving_size_g_ml: recipe.serving_size_g_ml,
        household_measure_text: recipe.household_measure_text,
        cooking_loss_pct: recipe.cooking_loss_pct,
        notes: recipe.notes,
      })
      .select('id')
      .single();
    if (error) {
      toast.error('Erro ao duplicar');
      return;
    }
    const newItems = items.map((i: any) => ({
      recipe_id: data.id,
      ingredient_id: i.ingredient_id,
      qty: i.qty,
      unit: i.unit,
      qty_in_grams_ml: i.qty_in_grams_ml,
      sort_order: i.sort_order,
    }));
    await supabase.from('recipe_items').insert(newItems);
    toast.success('Receita duplicada!');
    navigate(`/recipe/${data.id}`);
  };

  if (!recipe) {
    return (
      <AppLayout>
        <div className="py-12 text-center text-muted-foreground">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{recipe.name}</h1>
          <p className="text-sm text-muted-foreground">
            {recipe.product_type === 'solid' ? 'Sólido' : 'Líquido'} · Porção: {recipe.serving_size_g_ml}
            {recipe.product_type === 'liquid' ? 'ml' : 'g'} ({recipe.household_measure_text})
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={compute} disabled={computing} className="gap-2">
            {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Calcular
          </Button>
          <Link to={`/recipe/${id}/edit`}>
            <Button variant="outline" className="gap-1">
              <Edit className="h-4 w-4" /> Editar
            </Button>
          </Link>
          <Button variant="outline" onClick={duplicateRecipe} className="gap-1">
            <Copy className="h-4 w-4" /> Duplicar
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeLactose} onChange={(e) => setIncludeLactose(e.target.checked)} className="rounded" />
          Declarar lactose
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeTraces} onChange={(e) => setIncludeTraces(e.target.checked)} className="rounded" />
          "Pode conter traços"
        </label>
      </div>

      {result && warnings ? (
        <Tabs defaultValue="tabela" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tabela">Tabela</TabsTrigger>
            <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
            <TabsTrigger value="alergenicos">Alergênicos</TabsTrigger>
            <TabsTrigger value="altom">Alto em (lupa)</TabsTrigger>
            <TabsTrigger value="exportar">Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="tabela" forceMount className="data-[state=inactive]:hidden">
            <Card>
              <CardContent className="overflow-auto p-6">
                <NutritionLabel result={result} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ingredientes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lista de Ingredientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm leading-relaxed text-card-foreground">Ingredientes: {ingredientsList}</p>
                {recipe.notes && <p className="text-sm text-muted-foreground">{recipe.notes}</p>}
                <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => copyText(`Ingredientes: ${ingredientsList}`)}>
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alergenicos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Declarações Obrigatórias</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm font-semibold leading-relaxed text-card-foreground">{allergenDecl}</p>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => copyText(allergenDecl)}>
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="altom" forceMount className="data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rotulagem Frontal</CardTitle>
              </CardHeader>
              <CardContent>
                <FrontWarningSeals warnings={warnings} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exportar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exportar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 no-print">
                  <Button onClick={handlePrintPdf} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Baixar PDF
                  </Button>
                  <Button variant="outline" onClick={handlePreviewPrintArea} className="gap-2">
                    <Eye className="h-4 w-4" />
                    {showPrintPreview ? 'Ocultar área de impressão' : 'Visualizar área de impressão'}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground no-print">
                  O PDF é gerado pela tela nativa de impressão do navegador usando apenas a tabela nutricional em um layout limpo.
                </p>

                <ExportButtons
                  tableRef={exportTableRef}
                  sealsRef={exportSealsRef}
                  versionId={latestVersionId}
                  recipeName={recipe.name}
                  ingredientsList={ingredientsList}
                  allergenDecl={allergenDecl}
                  hasSeals={!!(warnings && (warnings.sugar_added || warnings.sat_fat || warnings.sodium))}
                />
                <div>
                  <p className="mb-1 text-sm font-medium text-card-foreground">Versão texto (copiar e colar):</p>
                  <pre className="max-h-40 overflow-auto rounded border border-border bg-muted p-3 text-xs">
{`INFORMAÇÃO NUTRICIONAL
Porção de ${result.serving_size_g_ml}${recipe.product_type === 'liquid' ? 'ml' : 'g'} (${result.household_measure})

Valor energético: ${result.per_serving.kcal} kcal (${result.per_serving.kj} kJ)
Carboidratos: ${result.per_serving.carbs_g} g
  Açúcares totais: ${result.per_serving.sugars_total_g} g
  Açúcares adicionados: ${result.per_serving.sugars_added_g} g
Proteínas: ${result.per_serving.protein_g} g
Gorduras totais: ${result.per_serving.fat_total_g} g
  Gorduras saturadas: ${result.per_serving.sat_fat_g} g
  Gorduras trans: ${result.per_serving.trans_fat_g} g
Fibra alimentar: ${result.per_serving.fiber_g} g
Sódio: ${result.per_serving.sodium_mg} mg

Ingredientes: ${ingredientsList}
${allergenDecl}`}
                  </pre>
                  <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => copyText(`Informação Nutricional...\n${ingredientsList}\n${allergenDecl}`)}>
                    <Copy className="h-3 w-3" /> Copiar tudo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">Clique em "Calcular" para gerar a rotulagem nutricional.</p>
          </CardContent>
        </Card>
      )}

      {versions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> Histórico de versões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded border border-border p-3 text-sm">
                  <span className="font-medium">Versão {v.version_number}</span>
                  <span className="text-muted-foreground">{format(new Date(v.computed_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && <NutritionTableExportStage ref={exportTableRef} result={result} />}
      {warnings && <FrontWarningExportStage ref={exportSealsRef} warnings={warnings} />}
      {result && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={printContainerRef}
              className={`print-nutrition-container ${showPrintPreview ? 'is-preview-active' : ''}`}
              aria-hidden={!showPrintPreview}
            >
              <div className="print-nutrition-paper">
                <NutritionLabel result={result} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </AppLayout>
  );
};

export default RecipeDetail;
