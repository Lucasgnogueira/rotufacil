CREATE POLICY "Users can update own exports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);