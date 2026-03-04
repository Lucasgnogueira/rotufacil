import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Package } from 'lucide-react';

interface PackagedProductFormProps {
  userId: string;
  initialName?: string;
  onCreated: (ingredient: { id: string; name: string; source: string }) => void;
  onCancel: () => void;
}

export function PackagedProductForm({ userId, initialName = '', onCreated, onCancel }: PackagedProductFormProps) {
  const [name, setName] = useState(initialName);
  const [brand, setBrand] = useState('');
  const [labelBase, setLabelBase] = useState<'per_100' | 'per_serving'>('per_100');
  const [labelServingSize, setLabelServingSize] = useState('');
  const [creating, setCreating] = useState(false);

  const [nutrients, setNutrients] = useState({
    kcal: '', carbs_g: '', sugars_total_g: '', sugars_added_g: '',
    protein_g: '', fat_total_g: '', sat_fat_g: '', trans_fat_g: '',
    fiber_g: '', sodium_mg: '',
  });

  const [flags, setFlags] = useState({
    contains_gluten: false, contains_lactose: false,
    is_allergen_milk: false, is_allergen_egg: false, is_allergen_wheat: false,
    is_allergen_soy: false, is_allergen_peanut: false, is_allergen_tree_nuts: false,
    is_allergen_fish: false, is_allergen_crustaceans: false,
  });

  const handleSave = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const raw = Object.fromEntries(
        Object.entries(nutrients).map(([k, v]) => [k, Number(v) || 0])
      ) as Record<string, number>;

      // Normalize to per_100 if entered per_serving
      let per100: Record<string, number> = { ...raw, kj: Math.round(raw.kcal * 4.184) };
      const servSize = Number(labelServingSize) || 0;

      if (labelBase === 'per_serving' && servSize > 0) {
        const factor = 100 / servSize;
        per100 = Object.fromEntries(
          Object.entries(per100).map(([k, v]) => [k, Math.round((v as number) * factor * 10) / 10])
        ) as typeof per100;
        per100.kj = Math.round(per100.kcal * 4.184);
      }

      const { data, error } = await supabase.from('ingredients').insert({
        owner_user_id: userId,
        name: brand ? `${name} (${brand})` : name,
        item_type: 'packaged_product' as any,
        brand,
        label_serving_size: servSize || null,
        label_base: labelBase,
        nutrients_per_100: per100,
        composition_source: 'Rótulo',
        ...flags,
      }).select('id, name').single();

      if (error) throw error;
      if (data) onCreated({ id: data.id, name: data.name, source: 'Rótulo' });
    } catch (err: any) {
      console.error('Error creating packaged product:', err);
    } finally {
      setCreating(false);
    }
  };

  const nutrientFields = [
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
  ];

  const allergenFlags = [
    { key: 'contains_gluten', label: 'Glúten' },
    { key: 'contains_lactose', label: 'Lactose' },
    { key: 'is_allergen_milk', label: 'Leite' },
    { key: 'is_allergen_egg', label: 'Ovo' },
    { key: 'is_allergen_wheat', label: 'Trigo' },
    { key: 'is_allergen_soy', label: 'Soja' },
    { key: 'is_allergen_peanut', label: 'Amendoim' },
    { key: 'is_allergen_tree_nuts', label: 'Castanhas' },
    { key: 'is_allergen_fish', label: 'Peixe' },
    { key: 'is_allergen_crustaceans', label: 'Crustáceos' },
  ];

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
        <Package className="h-3 w-3 text-primary" />
        Cadastrar produto industrializado
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Nome do produto *</label>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-7 text-xs" placeholder="Ex: Creme de leite" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Marca (opcional)</label>
          <Input value={brand} onChange={e => setBrand(e.target.value)} className="h-7 text-xs" placeholder="Ex: Nestlé" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Valores do rótulo baseados em</label>
          <select
            value={labelBase}
            onChange={e => setLabelBase(e.target.value as 'per_100' | 'per_serving')}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="per_100">Por 100g/100ml</option>
            <option value="per_serving">Por porção</option>
          </select>
        </div>
        {labelBase === 'per_serving' && (
          <div>
            <label className="text-[10px] text-muted-foreground">Porção do rótulo (g/ml) *</label>
            <Input
              type="number" min="0" step="0.1"
              value={labelServingSize}
              onChange={e => setLabelServingSize(e.target.value)}
              className="h-7 text-xs"
              placeholder="Ex: 30"
            />
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground font-medium">Nutrientes ({labelBase === 'per_serving' ? 'por porção' : 'por 100g/100ml'})</label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {nutrientFields.map(({ key, label }) => (
            <div key={key}>
              <label className="text-[10px] text-muted-foreground">{label}</label>
              <Input
                type="number" min="0" step="0.1"
                value={nutrients[key as keyof typeof nutrients]}
                onChange={e => setNutrients(prev => ({ ...prev, [key]: e.target.value }))}
                className="h-6 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground font-medium">Alergênicos / Contém</label>
        <div className="grid grid-cols-5 gap-1.5 mt-1">
          {allergenFlags.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
              <Checkbox
                checked={flags[key as keyof typeof flags]}
                onCheckedChange={v => setFlags(prev => ({ ...prev, [key]: !!v }))}
                className="h-3 w-3"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={creating || !name.trim()} className="h-7 text-xs gap-1">
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Salvar produto
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs">Cancelar</Button>
      </div>
    </div>
  );
}
