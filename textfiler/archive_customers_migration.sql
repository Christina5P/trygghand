-- Migration: Arkivering av kunder när de deaktiveras
-- Datum: 2025-12-10

-- 1. Skapa arkiverings-tabell för inaktiverade kunder
CREATE TABLE IF NOT EXISTS archived_customers (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  archived_reason TEXT,
  original_created_at TIMESTAMP WITH TIME ZONE,
  original_data JSONB, -- Lagra originaldata för referens
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Skapa index för snabb sökning
CREATE INDEX IF NOT EXISTS idx_archived_customers_email ON archived_customers(email);
CREATE INDEX IF NOT EXISTS idx_archived_customers_archived_at ON archived_customers(archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_customers_archived_by ON archived_customers(archived_by);

-- 3. RLS-policy för arkiverade kunder (endast admins kan se)
ALTER TABLE archived_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archived customers"
  ON archived_customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = auth.uid() AND customers.is_admin = true
    )
  );

CREATE POLICY "Admins can insert archived customers"
  ON archived_customers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = auth.uid() AND customers.is_admin = true
    )
  );
