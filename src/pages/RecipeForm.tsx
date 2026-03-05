import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { convertToGrams } from '@/lib/nutrition-engine';
import { IngredientSearch } from '@/components/IngredientSearch';

interface IngredientRow {
  id: string;
  name: string;
  density_g_ml: number | null;
  grams_per_unit: number | null;
}

interface RecipeItemLocal {
  tempId: string;
  ingredient_id: string;
  ingredient_name: string;
  ingredient_source?: string;
  qty: number;
  unit: string;
}

const UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
  { value: 'unidade', label: 'unidade' },
  { value: 'colher_sopa', label: 'colher (sopa)' },
  { value: 'colher_cha', label: 'colher (chá)' },
  { value: 'xicara', label: 'xícara' },
];

const RecipeForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [productType, setProductType] = useState<'solid' | 'liquid'>('solid');
  const [isSubproduct, setIsSubproduct] = useState(false);
  const [yieldTotal, setYieldTotal] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [householdMeasure, setHouseholdMeasure] = useState('1 porção');
  const [cookingLoss, setCookingLoss] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RecipeItemLocal[]>([]);
  const [allIngredients, setAllIngredients] = useState<IngredientRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    supabase
      .from('ingredients')
      .select('id, name, density_g_ml, grams_per_unit')
      .order('name')
      .then(({ data }) => {
        if (data) setAllIngredients(data);
      });
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const load = async () => {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      if (recipe) {
        setName(recipe.name);
        setProductType(recipe.product_type);
        setYieldTotal(String(recipe.yield_total_g_ml));
        setServingSize(String(recipe.serving_size_g_ml));
        setHouseholdMeasure(recipe.household_measure_text || '1 porção');
        setCookingLoss(String(recipe.cooking_loss_pct || 0));
        setNotes(recipe.notes || '');
        setIsSubproduct(recipe.is_subproduct || false);
      }
      const { data: recipeItems } = await supabase
        .from('recipe_items')
        .select('id, ingredient_id, qty, unit, ingredients(name)')
        .eq('recipe_id', id!)
        .order('sort_order');
      if (recipeItems) {
        setItems(recipeItems.map((ri: any) => ({
          tempId: ri.id,
          ingredient_id: ri.ingredient_id,
          ingredient_name: ri.ingredients?.name || '',
          qty: ri.qty,
          unit: ri.unit,
        })));
      }
    };
    load();
  }, [id, isEditing]);

  const addItem = () => {
    setItems(prev => [...prev, {
      tempId: crypto.randomUUID(),
      ingredient_id: '',
      ingredient_name: '',
      qty: 0,
      unit: 'g',
    }]);
  };

  const removeItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const updateItem = (tempId: string, field: string, value: any) => {
    setItems(prev => prev.map(i => {
      if (i.tempId !== tempId) return i;
      return { ...i, [field]: value };
    }));
  };

  const handleIngredientSelect = (tempId: string, ingredient: { id: string; name: string; source?: string }) => {
    setItems(prev => prev.map(i => {
      if (i.tempId !== tempId) return i;
      return { ...i, ingredient_id: ingredient.id, ingredient_name: ingredient.name, ingredient_source: ingredient.source };
    }));
    // Refresh allIngredients to include newly created ones
    supabase
      .from('ingredients')
      .select('id, name, density_g_ml, grams_per_unit')
      .order('name')
      .then(({ data }) => { if (data) setAllIngredients(data); });
  };

  const handleParse = async () => {
    if (!pasteText.trim() || !user) return;
    setParsing(true);
    try {
      const res = await supabase.functions.invoke('parse-recipe', {
        body: { text: pasteText },
      });
      if (res.error) throw new Error(res.error.message);
      const parsed = res.data;
      if (parsed.name) setName(parsed.name);
      if (parsed.product_type) setProductType(parsed.product_type);
      if (parsed.yield_total) setYieldTotal(String(parsed.yield_total));
      if (parsed.serving_size) setServingSize(String(parsed.serving_size));
      if (parsed.household_measure) setHouseholdMeasure(parsed.household_measure);
      if (parsed.items && Array.isArray(parsed.items)) {
        // Search composition DB for each parsed ingredient in parallel
        const searchResults = await Promise.all(
          parsed.items.map(async (pi: any) => {
            const name = pi.name || '';
            const { data } = await supabase.rpc('search_food_composition', {
              search_term: name,
              max_results: 1,
            });
            return { parsed: pi, compositionMatch: data && data.length > 0 ? data[0] : null };
          })
        );

        // Auto-create ingredients from composition matches in parallel
        const newItems = await Promise.all(
          searchResults.map(async ({ parsed: pi, compositionMatch }) => {
            if (compositionMatch && compositionMatch.similarity_score > 0.15) {
              // Create ingredient from composition data
              const nutrients = compositionMatch.per_100 as any;
              const { data: created } = await supabase.from('ingredients').insert({
                owner_user_id: user.id,
                name: compositionMatch.name_pt,
                item_type: 'ingredient' as any,
                nutrients_per_100: {
                  kcal: nutrients.kcal || 0,
                  kj: Math.round((nutrients.kcal || 0) * 4.184),
                  carbs_g: nutrients.carbs_g || 0,
                  sugars_total_g: nutrients.sugars_total_g || 0,
                  sugars_added_g: nutrients.sugars_added_g || 0,
                  protein_g: nutrients.protein_g || 0,
                  fat_total_g: nutrients.fat_total_g || 0,
                  sat_fat_g: nutrients.sat_fat_g || 0,
                  trans_fat_g: nutrients.trans_fat_g || 0,
                  fiber_g: nutrients.fiber_g || 0,
                  sodium_mg: nutrients.sodium_mg || 0,
                },
                density_g_ml: compositionMatch.density_g_ml,
                contains_gluten: compositionMatch.contains_gluten,
                contains_lactose: compositionMatch.contains_lactose,
                is_allergen_milk: compositionMatch.is_allergen_milk,
                is_allergen_egg: compositionMatch.is_allergen_egg,
                is_allergen_wheat: compositionMatch.is_allergen_wheat,
                is_allergen_soy: compositionMatch.is_allergen_soy,
                is_allergen_peanut: compositionMatch.is_allergen_peanut,
                is_allergen_tree_nuts: compositionMatch.is_allergen_tree_nuts,
                is_allergen_fish: compositionMatch.is_allergen_fish,
                is_allergen_crustaceans: compositionMatch.is_allergen_crustaceans,
                composition_source: compositionMatch.source,
                composition_source_id: compositionMatch.id,
              }).select('id, name, density_g_ml, grams_per_unit').single();

              if (created) {
                return {
                  tempId: crypto.randomUUID(),
                  ingredient_id: created.id,
                  ingredient_name: created.name,
                  ingredient_source: compositionMatch.source,
                  qty: pi.qty || 0,
                  unit: pi.unit || 'g',
                };
              }
            }
            // No match or creation failed — leave unmatched for manual selection
            return {
              tempId: crypto.randomUUID(),
              ingredient_id: '',
              ingredient_name: pi.name || '⚠ Não encontrado',
              qty: pi.qty || 0,
              unit: pi.unit || 'g',
            };
          })
        );

        setItems(newItems);
        // Refresh allIngredients to include newly created ones
        const { data: refreshed } = await supabase
          .from('ingredients')
          .select('id, name, density_g_ml, grams_per_unit')
          .order('name');
        if (refreshed) setAllIngredients(refreshed);

        const unmatchedCount = newItems.filter(i => !i.ingredient_id).length;
        if (unmatchedCount > 0) {
          toast.success(`Receita interpretada! ${unmatchedCount} ingrediente(s) precisam de seleção manual.`);
        } else {
          toast.success('Receita interpretada! Todos os ingredientes foram vinculados automaticamente.');
        }
      }
    } catch (err: any) {
      toast.error('Erro ao interpretar receita: ' + (err.message || 'tente novamente'));
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!yieldTotal || Number(yieldTotal) <= 0) { toast.error('Rendimento total é obrigatório'); return; }
    if (!servingSize || Number(servingSize) <= 0) { toast.error('Porção é obrigatória'); return; }
    if (items.length === 0) { toast.error('Adicione ao menos um ingrediente'); return; }

    const unmatched = items.filter(i => !i.ingredient_id);
    if (unmatched.length > 0) {
      toast.error(`${unmatched.length} ingrediente(s) sem correspondência na base. Selecione ou crie.`);
      return;
    }

    setSaving(true);
    try {
      let recipeId = id;
      if (isEditing) {
        const { error } = await supabase
          .from('recipes')
          .update({
            name,
            product_type: productType,
            yield_total_g_ml: Number(yieldTotal),
            serving_size_g_ml: Number(servingSize),
            household_measure_text: householdMeasure,
            cooking_loss_pct: Number(cookingLoss),
            notes,
            is_subproduct: isSubproduct,
          })
          .eq('id', id!);
        if (error) throw error;
        // Delete old items
        await supabase.from('recipe_items').delete().eq('recipe_id', id!);
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            owner_user_id: user.id,
            name,
            product_type: productType,
            yield_total_g_ml: Number(yieldTotal),
            serving_size_g_ml: Number(servingSize),
            household_measure_text: householdMeasure,
            cooking_loss_pct: Number(cookingLoss),
            notes,
            is_subproduct: isSubproduct,
          })
          .select('id')
          .single();
        if (error) throw error;
        recipeId = data.id;
      }

      // Insert items
      const itemsToInsert = items.map((item, idx) => {
        const ing = allIngredients.find(i => i.id === item.ingredient_id);
        const gramsML = convertToGrams(item.qty, item.unit, ing?.density_g_ml, ing?.grams_per_unit);
        return {
          recipe_id: recipeId!,
          ingredient_id: item.ingredient_id,
          qty: item.qty,
          unit: item.unit,
          qty_in_grams_ml: gramsML,
          sort_order: idx,
        };
      });

      const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast.success(isEditing ? 'Receita atualizada!' : 'Receita salva!');
      navigate(`/recipe/${recipeId}`);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        {isEditing ? 'Editar Receita' : 'Nova Receita'}
      </h1>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Paste or manual */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-accent" />
                Colar receita (IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Cole aqui a receita em texto livre. Ex: Bolo de chocolate: 200g farinha, 3 ovos, 100g açúcar, 50g manteiga..."
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={4}
              />
              <Button onClick={handleParse} disabled={parsing || !pasteText.trim()} variant="secondary" className="gap-2">
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Interpretar receita
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do produto *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Bolo de chocolate" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de produto *</Label>
                <select
                  value={productType}
                  onChange={e => setProductType(e.target.value as 'solid' | 'liquid')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="solid">Sólido / Semissólido</option>
                  <option value="liquid">Líquido</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Perda por cocção (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={cookingLoss}
                  onChange={e => setCookingLoss(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rendimento total ({productType === 'liquid' ? 'ml' : 'g'}) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={yieldTotal}
                  onChange={e => setYieldTotal(e.target.value)}
                  placeholder="Ex: 500"
                />
              </div>
              <div className="space-y-2">
                <Label>Porção ({productType === 'liquid' ? 'ml' : 'g'}) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={servingSize}
                  onChange={e => setServingSize(e.target.value)}
                  placeholder="Ex: 60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Medida caseira</Label>
              <Input
                value={householdMeasure}
                onChange={e => setHouseholdMeasure(e.target.value)}
                placeholder="Ex: 1 fatia, 1/2 xícara"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações do rótulo</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: contém aromatizante artificial"
              />
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <Switch checked={isSubproduct} onCheckedChange={setIsSubproduct} />
              <div>
                <Label className="cursor-pointer">Marcar como subproduto</Label>
                <p className="text-xs text-muted-foreground">
                  Permite usar esta receita como ingrediente em outras receitas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ingredientes</CardTitle>
            <Button onClick={addItem} size="sm" variant="outline" className="gap-1">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum ingrediente. Adicione manualmente ou cole a receita acima.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.tempId} className="flex items-end gap-2 rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Ingrediente</Label>
                      <IngredientSearch
                        userId={user?.id || ''}
                        selectedName={item.ingredient_name || undefined}
                        onSelect={(ing) => handleIngredientSelect(item.tempId, ing)}
                      />
                      {item.ingredient_source && (
                        <span className="text-[10px] text-muted-foreground">Fonte: {item.ingredient_source}</span>
                      )}
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.qty}
                        onChange={e => updateItem(item.tempId, 'qty', Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Unidade</Label>
                      <select
                        value={item.unit}
                        onChange={e => updateItem(item.tempId, 'unit', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        {UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.tempId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar e calcular'}
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default RecipeForm;
