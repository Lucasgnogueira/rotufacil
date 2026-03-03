import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2, Database, AlertTriangle } from 'lucide-react';

interface FoodCompositionMatch {
  id: string;
  source: string;
  name_pt: string;
  food_category: string | null;
  similarity_score: number;
  per_100: any;
  density_g_ml: number | null;
  contains_gluten: boolean;
  contains_lactose: boolean;
  is_allergen_milk: boolean;
  is_allergen_egg: boolean;
  is_allergen_wheat: boolean;
  is_allergen_soy: boolean;
  is_allergen_peanut: boolean;
  is_allergen_tree_nuts: boolean;
  is_allergen_fish: boolean;
  is_allergen_crustaceans: boolean;
}

interface ExistingIngredient {
  id: string;
  name: string;
  composition_source?: string | null;
}

interface IngredientSearchProps {
  onSelect: (ingredient: { id: string; name: string; source?: string }) => void;
  userId: string;
  selectedName?: string;
}

export function IngredientSearch({ onSelect, userId, selectedName }: IngredientSearchProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [existingMatches, setExistingMatches] = useState<ExistingIngredient[]>([]);
  const [compositionMatches, setCompositionMatches] = useState<FoodCompositionMatch[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Manual form state
  const [manualName, setManualName] = useState('');
  const [manualNutrients, setManualNutrients] = useState({
    kcal: '', carbs_g: '', sugars_total_g: '', sugars_added_g: '',
    protein_g: '', fat_total_g: '', sat_fat_g: '', trans_fat_g: '',
    fiber_g: '', sodium_mg: '',
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = async (term: string) => {
    if (term.length < 2) {
      setExistingMatches([]);
      setCompositionMatches([]);
      return;
    }
    setSearching(true);
    try {
      // Search existing ingredients (user's + global)
      const { data: existing } = await supabase
        .from('ingredients')
        .select('id, name, composition_source')
        .ilike('name', `%${term}%`)
        .limit(5);

      // Search food composition DB via RPC
      const { data: composition } = await supabase.rpc('search_food_composition', {
        search_term: term,
        max_results: 5,
      });

      setExistingMatches(existing || []);
      setCompositionMatches((composition as FoodCompositionMatch[]) || []);
      setShowResults(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const selectExisting = (ing: ExistingIngredient) => {
    onSelect({ id: ing.id, name: ing.name, source: ing.composition_source || undefined });
    setQuery('');
    setShowResults(false);
  };

  const selectFromComposition = async (match: FoodCompositionMatch) => {
    setCreating(true);
    try {
      // Create ingredient from composition data
      const nutrients = match.per_100;
      const { data, error } = await supabase.from('ingredients').insert({
        owner_user_id: userId,
        name: match.name_pt,
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
        density_g_ml: match.density_g_ml,
        contains_gluten: match.contains_gluten,
        contains_lactose: match.contains_lactose,
        is_allergen_milk: match.is_allergen_milk,
        is_allergen_egg: match.is_allergen_egg,
        is_allergen_wheat: match.is_allergen_wheat,
        is_allergen_soy: match.is_allergen_soy,
        is_allergen_peanut: match.is_allergen_peanut,
        is_allergen_tree_nuts: match.is_allergen_tree_nuts,
        is_allergen_fish: match.is_allergen_fish,
        is_allergen_crustaceans: match.is_allergen_crustaceans,
        composition_source: match.source,
        composition_source_id: match.id,
      }).select('id, name').single();

      if (error) throw error;
      if (data) {
        onSelect({ id: data.id, name: data.name, source: match.source });
      }
      setQuery('');
      setShowResults(false);
    } catch (err: any) {
      console.error('Error creating ingredient from composition:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualName.trim()) return;
    setCreating(true);
    try {
      const n = manualNutrients;
      const { data, error } = await supabase.from('ingredients').insert({
        owner_user_id: userId,
        name: manualName,
        nutrients_per_100: {
          kcal: Number(n.kcal) || 0,
          kj: Math.round((Number(n.kcal) || 0) * 4.184),
          carbs_g: Number(n.carbs_g) || 0,
          sugars_total_g: Number(n.sugars_total_g) || 0,
          sugars_added_g: Number(n.sugars_added_g) || 0,
          protein_g: Number(n.protein_g) || 0,
          fat_total_g: Number(n.fat_total_g) || 0,
          sat_fat_g: Number(n.sat_fat_g) || 0,
          trans_fat_g: Number(n.trans_fat_g) || 0,
          fiber_g: Number(n.fiber_g) || 0,
          sodium_mg: Number(n.sodium_mg) || 0,
        },
        composition_source: 'Manual',
      }).select('id, name').single();

      if (error) throw error;
      if (data) {
        onSelect({ id: data.id, name: data.name, source: 'Manual' });
      }
      setShowManualForm(false);
      setManualName('');
      setQuery('');
    } catch (err: any) {
      console.error('Error creating manual ingredient:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {selectedName && !showResults && !query ? (
        <div
          className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50"
          onClick={() => { setQuery(''); setShowResults(false); }}
        >
          <span className="flex-1 truncate">{selectedName}</span>
          <button
            className="text-muted-foreground hover:text-foreground text-xs"
            onClick={(e) => { e.stopPropagation(); setQuery(''); handleInputChange(''); }}
          >
            trocar
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => { if (query.length >= 2) setShowResults(true); }}
            placeholder="Buscar ingrediente..."
            className="h-8 pl-7 text-sm"
          />
          {searching && <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      )}

      {showResults && (query.length >= 2) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {/* Existing ingredients */}
          {existingMatches.length > 0 && (
            <div className="p-1">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Ingredientes cadastrados</p>
              {existingMatches.map(ing => (
                <button
                  key={ing.id}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                  onClick={() => selectExisting(ing)}
                >
                  <Database className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{ing.name}</span>
                  {ing.composition_source && (
                    <Badge variant="outline" className="text-[10px] shrink-0">{ing.composition_source}</Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Composition DB matches */}
          {compositionMatches.length > 0 && (
            <div className="border-t border-border p-1">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Base TACO/IBGE</p>
              {compositionMatches.map(match => (
                <button
                  key={match.id}
                  disabled={creating}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left disabled:opacity-50"
                  onClick={() => selectFromComposition(match)}
                >
                  <Database className="h-3 w-3 shrink-0 text-primary" />
                  <span className="flex-1 truncate">{match.name_pt}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{match.source}</Badge>
                  {match.food_category && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{match.food_category}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {existingMatches.length === 0 && compositionMatches.length === 0 && !searching && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              <AlertTriangle className="mx-auto mb-1 h-4 w-4" />
              Nenhum ingrediente encontrado para "{query}"
            </div>
          )}

          {/* Manual create option */}
          <div className="border-t border-border p-1">
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
              onClick={() => { setShowManualForm(true); setManualName(query); setShowResults(false); }}
            >
              <Plus className="h-3 w-3 shrink-0 text-primary" />
              <span>Criar "{query}" manualmente</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual creation form */}
      {showManualForm && (
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            Cadastro manual — informe valores por 100g
          </p>
          <Input
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            placeholder="Nome do ingrediente"
            className="h-7 text-xs"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'kcal', label: 'kcal' },
              { key: 'carbs_g', label: 'Carb (g)' },
              { key: 'sugars_total_g', label: 'Açúc. total (g)' },
              { key: 'sugars_added_g', label: 'Açúc. adic. (g)' },
              { key: 'protein_g', label: 'Proteína (g)' },
              { key: 'fat_total_g', label: 'Gord. total (g)' },
              { key: 'sat_fat_g', label: 'Gord. sat. (g)' },
              { key: 'trans_fat_g', label: 'Gord. trans (g)' },
              { key: 'fiber_g', label: 'Fibra (g)' },
              { key: 'sodium_mg', label: 'Sódio (mg)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] text-muted-foreground">{label}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualNutrients[key as keyof typeof manualNutrients]}
                  onChange={e => setManualNutrients(prev => ({ ...prev, [key]: e.target.value }))}
                  className="h-6 text-xs"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleManualCreate} disabled={creating || !manualName.trim()} className="h-7 text-xs gap-1">
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Salvar ingrediente
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowManualForm(false)} className="h-7 text-xs">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
