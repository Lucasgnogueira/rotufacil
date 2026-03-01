// Deterministic nutrition calculation engine
// Based on ANVISA RDC 429/2020 + IN 75/2020

export interface NutrientsPer100 {
  kcal: number;
  kj: number;
  carbs_g: number;
  sugars_total_g: number;
  sugars_added_g: number;
  protein_g: number;
  fat_total_g: number;
  sat_fat_g: number;
  trans_fat_g: number;
  fiber_g: number;
  sodium_mg: number;
}

export interface RecipeItem {
  ingredient_name: string;
  qty_in_grams_ml: number;
  nutrients_per_100: NutrientsPer100;
  is_allergen_milk: boolean;
  is_allergen_egg: boolean;
  is_allergen_wheat: boolean;
  is_allergen_soy: boolean;
  is_allergen_peanut: boolean;
  is_allergen_tree_nuts: boolean;
  is_allergen_fish: boolean;
  is_allergen_crustaceans: boolean;
  contains_gluten: boolean;
  contains_lactose: boolean;
}

export interface NutritionResult {
  per_serving: NutrientsPer100;
  per_100: NutrientsPer100;
  total_recipe: NutrientsPer100;
  vd_per_serving: Record<string, number>;
  serving_size_g_ml: number;
  household_measure: string;
  product_type: 'solid' | 'liquid';
}

export interface FrontWarning {
  sugar_added: boolean;
  sat_fat: boolean;
  sodium: boolean;
  sugar_value: number;
  sat_fat_value: number;
  sodium_value: number;
  sugar_limit: number;
  sat_fat_limit: number;
  sodium_limit: number;
}

// Daily Reference Values (VD) - ANVISA 2000 kcal diet
const DAILY_VALUES = {
  kcal: 2000,
  carbs_g: 300,
  protein_g: 75,
  fat_total_g: 55,
  sat_fat_g: 22,
  fiber_g: 25,
  sodium_mg: 2400,
  sugars_added_g: 50,
};

// Front-of-pack warning limits (ANVISA RDC 429/2020)
const FRONT_LIMITS = {
  solid: { sugars_added_g: 15, sat_fat_g: 6, sodium_mg: 600 },
  liquid: { sugars_added_g: 7.5, sat_fat_g: 3, sodium_mg: 300 },
};

function roundNutrient(value: number, unit: 'g' | 'mg' | 'kcal' | 'kj'): number {
  if (unit === 'kcal' || unit === 'kj') return Math.round(value);
  if (unit === 'mg') return Math.round(value);
  return Math.round(value * 10) / 10; // 1 decimal for grams
}

function sumNutrients(items: RecipeItem[]): NutrientsPer100 {
  const total: NutrientsPer100 = {
    kcal: 0, kj: 0, carbs_g: 0, sugars_total_g: 0, sugars_added_g: 0,
    protein_g: 0, fat_total_g: 0, sat_fat_g: 0, trans_fat_g: 0,
    fiber_g: 0, sodium_mg: 0,
  };
  for (const item of items) {
    const factor = item.qty_in_grams_ml / 100;
    const n = item.nutrients_per_100;
    total.kcal += n.kcal * factor;
    total.kj += n.kj * factor;
    total.carbs_g += n.carbs_g * factor;
    total.sugars_total_g += n.sugars_total_g * factor;
    total.sugars_added_g += n.sugars_added_g * factor;
    total.protein_g += n.protein_g * factor;
    total.fat_total_g += n.fat_total_g * factor;
    total.sat_fat_g += n.sat_fat_g * factor;
    total.trans_fat_g += n.trans_fat_g * factor;
    total.fiber_g += n.fiber_g * factor;
    total.sodium_mg += n.sodium_mg * factor;
  }
  return total;
}

function scaleNutrients(nutrients: NutrientsPer100, factor: number): NutrientsPer100 {
  return {
    kcal: roundNutrient(nutrients.kcal * factor, 'kcal'),
    kj: roundNutrient(nutrients.kj * factor, 'kj'),
    carbs_g: roundNutrient(nutrients.carbs_g * factor, 'g'),
    sugars_total_g: roundNutrient(nutrients.sugars_total_g * factor, 'g'),
    sugars_added_g: roundNutrient(nutrients.sugars_added_g * factor, 'g'),
    protein_g: roundNutrient(nutrients.protein_g * factor, 'g'),
    fat_total_g: roundNutrient(nutrients.fat_total_g * factor, 'g'),
    sat_fat_g: roundNutrient(nutrients.sat_fat_g * factor, 'g'),
    trans_fat_g: roundNutrient(nutrients.trans_fat_g * factor, 'g'),
    fiber_g: roundNutrient(nutrients.fiber_g * factor, 'g'),
    sodium_mg: roundNutrient(nutrients.sodium_mg * factor, 'mg'),
  };
}

export function computeNutrition(
  items: RecipeItem[],
  yieldTotalGml: number,
  servingSizeGml: number,
  householdMeasure: string,
  productType: 'solid' | 'liquid',
  cookingLossPct: number = 0,
): NutritionResult {
  const totalRaw = sumNutrients(items);
  
  // Apply cooking loss (reduces yield, concentrates nutrients per gram)
  const effectiveYield = yieldTotalGml * (1 - cookingLossPct / 100);
  
  // Per 100g/100ml
  const per100Factor = 100 / effectiveYield;
  const per_100 = scaleNutrients(totalRaw, per100Factor);
  
  // Per serving
  const perServingFactor = servingSizeGml / effectiveYield;
  const per_serving = scaleNutrients(totalRaw, perServingFactor);
  
  // Total recipe (rounded)
  const total_recipe = scaleNutrients(totalRaw, 1);
  
  // %VD per serving
  const vd_per_serving: Record<string, number> = {};
  for (const [key, dv] of Object.entries(DAILY_VALUES)) {
    const val = per_serving[key as keyof NutrientsPer100];
    if (val !== undefined && dv > 0) {
      vd_per_serving[key] = Math.round((val / dv) * 100);
    }
  }

  return {
    per_serving,
    per_100,
    total_recipe,
    vd_per_serving,
    serving_size_g_ml: servingSizeGml,
    household_measure: householdMeasure,
    product_type: productType,
  };
}

export function checkFrontWarning(
  productType: 'solid' | 'liquid',
  per100: NutrientsPer100,
): FrontWarning {
  const limits = FRONT_LIMITS[productType];
  return {
    sugar_added: per100.sugars_added_g >= limits.sugars_added_g,
    sat_fat: per100.sat_fat_g >= limits.sat_fat_g,
    sodium: per100.sodium_mg >= limits.sodium_mg,
    sugar_value: per100.sugars_added_g,
    sat_fat_value: per100.sat_fat_g,
    sodium_value: per100.sodium_mg,
    sugar_limit: limits.sugars_added_g,
    sat_fat_limit: limits.sat_fat_g,
    sodium_limit: limits.sodium_mg,
  };
}

export function generateIngredientsList(
  items: { ingredient_name: string; qty_in_grams_ml: number }[],
): string {
  const sorted = [...items].sort((a, b) => b.qty_in_grams_ml - a.qty_in_grams_ml);
  return sorted.map(i => i.ingredient_name.toLowerCase()).join(', ') + '.';
}

export function generateAllergenDeclarations(
  items: RecipeItem[],
  includeTraces: boolean = false,
  includeLactose: boolean = false,
): string {
  const allergens: string[] = [];
  let hasGluten = false;
  let hasLactose = false;

  for (const item of items) {
    if (item.is_allergen_milk) allergens.push('LEITE');
    if (item.is_allergen_egg) allergens.push('OVO');
    if (item.is_allergen_wheat) allergens.push('TRIGO');
    if (item.is_allergen_soy) allergens.push('SOJA');
    if (item.is_allergen_peanut) allergens.push('AMENDOIM');
    if (item.is_allergen_tree_nuts) allergens.push('CASTANHAS');
    if (item.is_allergen_fish) allergens.push('PEIXE');
    if (item.is_allergen_crustaceans) allergens.push('CRUSTÁCEOS');
    if (item.contains_gluten) hasGluten = true;
    if (item.contains_lactose) hasLactose = true;
  }

  const unique = [...new Set(allergens)];
  const parts: string[] = [];

  if (unique.length > 0) {
    parts.push(`ALÉRGICOS: CONTÉM ${unique.join(', ')}.`);
  }
  if (includeTraces && unique.length > 0) {
    parts.push(`PODE CONTER TRAÇOS DE ${unique.join(', ')}.`);
  }
  parts.push(hasGluten ? 'CONTÉM GLÚTEN.' : 'NÃO CONTÉM GLÚTEN.');
  if (includeLactose) {
    parts.push(hasLactose ? 'CONTÉM LACTOSE.' : 'NÃO CONTÉM LACTOSE.');
  }

  return parts.join(' ');
}

export function convertToGrams(qty: number, unit: string, densityGml?: number | null, gramsPerUnit?: number | null): number | null {
  switch (unit) {
    case 'g': return qty;
    case 'kg': return qty * 1000;
    case 'ml': return densityGml ? qty * densityGml : qty;
    case 'L': return densityGml ? qty * 1000 * densityGml : qty * 1000;
    case 'unidade': return gramsPerUnit ? qty * gramsPerUnit : null;
    case 'colher_sopa': return qty * 15 * (densityGml || 1);
    case 'colher_cha': return qty * 5 * (densityGml || 1);
    case 'xicara': return qty * 240 * (densityGml || 1);
    default: return qty;
  }
}
