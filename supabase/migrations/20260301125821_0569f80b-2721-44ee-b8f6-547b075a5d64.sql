
-- Create product_type enum
CREATE TYPE public.product_type AS ENUM ('solid', 'liquid');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  default_serving_unit TEXT DEFAULT 'g',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  synonyms TEXT[] DEFAULT '{}',
  is_allergen_milk BOOLEAN DEFAULT FALSE,
  is_allergen_egg BOOLEAN DEFAULT FALSE,
  is_allergen_wheat BOOLEAN DEFAULT FALSE,
  is_allergen_soy BOOLEAN DEFAULT FALSE,
  is_allergen_peanut BOOLEAN DEFAULT FALSE,
  is_allergen_tree_nuts BOOLEAN DEFAULT FALSE,
  is_allergen_fish BOOLEAN DEFAULT FALSE,
  is_allergen_crustaceans BOOLEAN DEFAULT FALSE,
  contains_gluten BOOLEAN DEFAULT FALSE,
  contains_lactose BOOLEAN DEFAULT FALSE,
  density_g_ml NUMERIC,
  grams_per_unit NUMERIC,
  nutrients_per_100 JSONB NOT NULL DEFAULT '{
    "kcal": 0, "kj": 0, "carbs_g": 0, "sugars_total_g": 0, "sugars_added_g": 0,
    "protein_g": 0, "fat_total_g": 0, "sat_fat_g": 0, "trans_fat_g": 0,
    "fiber_g": 0, "sodium_mg": 0
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global ingredients" ON public.ingredients FOR SELECT USING (owner_user_id IS NULL OR owner_user_id = auth.uid());
CREATE POLICY "Users can insert their own ingredients" ON public.ingredients FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Users can update their own ingredients" ON public.ingredients FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Users can delete their own ingredients" ON public.ingredients FOR DELETE USING (owner_user_id = auth.uid());

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_type public.product_type NOT NULL DEFAULT 'solid',
  yield_total_g_ml NUMERIC NOT NULL DEFAULT 0,
  serving_size_g_ml NUMERIC NOT NULL DEFAULT 0,
  household_measure_text TEXT DEFAULT '1 porção',
  cooking_loss_pct NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recipes" ON public.recipes FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "Users can create their own recipes" ON public.recipes FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Users can update their own recipes" ON public.recipes FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Users can delete their own recipes" ON public.recipes FOR DELETE USING (owner_user_id = auth.uid());

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create recipe_items table
CREATE TABLE public.recipe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id),
  qty NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'g',
  qty_in_grams_ml NUMERIC,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check recipe ownership
CREATE OR REPLACE FUNCTION public.owns_recipe(recipe_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recipes WHERE id = recipe_uuid AND owner_user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY "Users can view their own recipe items" ON public.recipe_items FOR SELECT USING (public.owns_recipe(recipe_id));
CREATE POLICY "Users can create their own recipe items" ON public.recipe_items FOR INSERT WITH CHECK (public.owns_recipe(recipe_id));
CREATE POLICY "Users can update their own recipe items" ON public.recipe_items FOR UPDATE USING (public.owns_recipe(recipe_id));
CREATE POLICY "Users can delete their own recipe items" ON public.recipe_items FOR DELETE USING (public.owns_recipe(recipe_id));

-- Create recipe_versions table
CREATE TABLE public.recipe_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  inputs_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  results_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  front_warning_flags JSONB DEFAULT '{}'::jsonb,
  ingredients_list TEXT,
  allergen_declarations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recipe versions" ON public.recipe_versions FOR SELECT USING (public.owns_recipe(recipe_id));
CREATE POLICY "Users can create their own recipe versions" ON public.recipe_versions FOR INSERT WITH CHECK (public.owns_recipe(recipe_id));
CREATE POLICY "Users can update their own recipe versions" ON public.recipe_versions FOR UPDATE USING (public.owns_recipe(recipe_id));
CREATE POLICY "Users can delete their own recipe versions" ON public.recipe_versions FOR DELETE USING (public.owns_recipe(recipe_id));
