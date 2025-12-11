-- SQL: Lägg till DELETE-policy för archived_customers
-- Kör detta i Supabase SQL Editor

-- Tillåt admins att radera arkiverade kunder
CREATE POLICY "Admins can delete archived customers"
  ON archived_customers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = auth.uid() AND customers.is_admin = true
    )
  );
