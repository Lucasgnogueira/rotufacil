
-- 1) Create item_type enum
CREATE TYPE public.item_type AS ENUM ('ingredient', 'packaged_product', 'subproduct');

-- 2) Add columns to ingredients table
ALTER TABLE public.ingredients
  ADD COLUMN item_type public.item_type NOT NULL DEFAULT 'ingredient',
  ADD COLUMN brand text,
  ADD COLUMN label_serving_size numeric,
  ADD COLUMN label_base text DEFAULT 'per_100' CHECK (label_base IN ('per_100', 'per_serving')),
  ADD COLUMN source_recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  ADD COLUMN source_version_id uuid REFERENCES public.recipe_versions(id) ON DELETE SET NULL;

-- 3) Add is_subproduct flag to recipes
ALTER TABLE public.recipes
  ADD COLUMN is_subproduct boolean NOT NULL DEFAULT false;

-- 4) Index for efficient filtering
CREATE INDEX idx_ingredients_item_type ON public.ingredients (item_type);
CREATE INDEX idx_recipes_is_subproduct ON public.recipes (is_subproduct) WHERE is_subproduct = true;
