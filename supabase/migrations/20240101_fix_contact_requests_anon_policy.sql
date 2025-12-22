-- Add RLS policy to allow anonymous users to insert contact requests
-- This is needed for the public contact form on the website

-- First, drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage contact requests" ON contact_requests;

-- Add new policies:
-- 1. Anyone (anon or authenticated) can INSERT
CREATE POLICY "Anyone can insert contact requests"
  ON contact_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Only admins can SELECT/UPDATE/DELETE
CREATE POLICY "Admins can view contact requests" ON contact_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update contact requests" ON contact_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete contact requests" ON contact_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
