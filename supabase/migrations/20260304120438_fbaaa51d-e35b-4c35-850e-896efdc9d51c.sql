
-- Storage bucket for exports
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Storage RLS: users can read their own exports
CREATE POLICY "Users can read own exports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: users can insert their own exports
CREATE POLICY "Users can insert own exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Exports tracking table
CREATE TABLE public.recipe_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id uuid NOT NULL REFERENCES public.recipe_versions(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  export_type text NOT NULL, -- 'table_png', 'seals_png', 'full_pdf'
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_version_id, export_type)
);

ALTER TABLE public.recipe_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
ON public.recipe_exports FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can insert own exports"
ON public.recipe_exports FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own exports"
ON public.recipe_exports FOR DELETE TO authenticated
USING (owner_user_id = auth.uid());
