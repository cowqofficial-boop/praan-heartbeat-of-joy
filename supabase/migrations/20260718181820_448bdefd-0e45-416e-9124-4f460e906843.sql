
CREATE POLICY "praan read" ON storage.objects FOR SELECT USING (bucket_id = 'praan');
CREATE POLICY "praan insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'praan');
CREATE POLICY "praan update" ON storage.objects FOR UPDATE USING (bucket_id = 'praan') WITH CHECK (bucket_id = 'praan');
