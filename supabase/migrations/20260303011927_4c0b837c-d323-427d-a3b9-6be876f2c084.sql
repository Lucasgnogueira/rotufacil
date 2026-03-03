
-- Enable pg_trgm for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Food composition sources reference table
CREATE TABLE public.food_composition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'TACO', -- 'TACO' or 'IBGE'
  source_item_id text,
  name_pt text NOT NULL,
  synonyms text[] DEFAULT '{}',
  per_100 jsonb NOT NULL DEFAULT '{}'::jsonb,
  food_category text,
  density_g_ml numeric,
  contains_gluten boolean DEFAULT false,
  contains_lactose boolean DEFAULT false,
  is_allergen_milk boolean DEFAULT false,
  is_allergen_egg boolean DEFAULT false,
  is_allergen_wheat boolean DEFAULT false,
  is_allergen_soy boolean DEFAULT false,
  is_allergen_peanut boolean DEFAULT false,
  is_allergen_tree_nuts boolean DEFAULT false,
  is_allergen_fish boolean DEFAULT false,
  is_allergen_crustaceans boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for trigram similarity search
CREATE INDEX idx_fci_name_trgm ON public.food_composition_items USING gin (name_pt gin_trgm_ops);
CREATE INDEX idx_fci_synonyms ON public.food_composition_items USING gin (synonyms);

-- RLS: read-only for all authenticated users
ALTER TABLE public.food_composition_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read food composition"
  ON public.food_composition_items FOR SELECT TO authenticated
  USING (true);

-- Add source tracking to ingredients table
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS composition_source text,
  ADD COLUMN IF NOT EXISTS composition_source_id uuid REFERENCES public.food_composition_items(id);

-- Search function using trigram similarity
CREATE OR REPLACE FUNCTION public.search_food_composition(search_term text, max_results int DEFAULT 5)
RETURNS TABLE(
  id uuid,
  source text,
  name_pt text,
  food_category text,
  similarity_score real,
  per_100 jsonb,
  density_g_ml numeric,
  contains_gluten boolean,
  contains_lactose boolean,
  is_allergen_milk boolean,
  is_allergen_egg boolean,
  is_allergen_wheat boolean,
  is_allergen_soy boolean,
  is_allergen_peanut boolean,
  is_allergen_tree_nuts boolean,
  is_allergen_fish boolean,
  is_allergen_crustaceans boolean
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    fci.id,
    fci.source,
    fci.name_pt,
    fci.food_category,
    similarity(lower(fci.name_pt), lower(search_term)) AS similarity_score,
    fci.per_100,
    fci.density_g_ml,
    fci.contains_gluten,
    fci.contains_lactose,
    fci.is_allergen_milk,
    fci.is_allergen_egg,
    fci.is_allergen_wheat,
    fci.is_allergen_soy,
    fci.is_allergen_peanut,
    fci.is_allergen_tree_nuts,
    fci.is_allergen_fish,
    fci.is_allergen_crustaceans
  FROM public.food_composition_items fci
  WHERE lower(fci.name_pt) % lower(search_term)
     OR fci.name_pt ILIKE '%' || search_term || '%'
     OR EXISTS (SELECT 1 FROM unnest(fci.synonyms) s WHERE s ILIKE '%' || search_term || '%')
  ORDER BY similarity(lower(fci.name_pt), lower(search_term)) DESC, fci.name_pt ASC
  LIMIT max_results;
$$;
