-- Migration: Lägg till is_customer kolumn i customers tabellen
-- Kör detta i Supabase SQL Editor

-- 1. Lägg till kolumnen
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_customer BOOLEAN DEFAULT FALSE;

-- 2. Uppdatera befintliga kunder (valfritt - sätter alla till false som standard)
UPDATE public.customers 
SET is_customer = FALSE 
WHERE is_customer IS NULL;

-- 3. Lägg till kommentar för dokumentation
COMMENT ON COLUMN public.customers.is_customer IS 'Flagga som indikerar om användaren är en aktiv kund med tillgång till premium-funktioner';

-- 4. Verifiera att kolumnen skapades
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'is_customer';
