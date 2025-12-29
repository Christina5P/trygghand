-- Migration: Storage bucket policies for template access
-- Date: 2025-12-27
-- Enable anonymous access to template files in fullmakts-filer bucket

BEGIN;

-- Enable RLS on storage.objects if not already enabled
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- Commented out - not owner

-- Policy to allow anonymous users to read template files
-- This allows anyone to download templates from the fullmaktsmallar/ directory
CREATE POLICY "Allow anonymous access to templates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fullmakts-filer' AND
    (storage.foldername(name))[1] = 'fullmaktsmallar'
  );

-- Policy to allow authenticated users to upload their own fullmakt files
CREATE POLICY "Users can upload their own fullmakt files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fullmakts-filer' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'fullmakter' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy to allow users to read their own fullmakt files
CREATE POLICY "Users can read their own fullmakt files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fullmakts-filer' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'fullmakter' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy to allow admins to manage all files
CREATE POLICY "Admins can manage all files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'fullmakts-filer' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM customers
      WHERE id = auth.uid() AND is_admin = true
    )
  );

COMMIT;