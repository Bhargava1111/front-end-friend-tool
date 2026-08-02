CREATE POLICY "media_read_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media');
CREATE POLICY "media_read_anon" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'media');
CREATE POLICY "media_insert_admin" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media_update_admin" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media_delete_admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));