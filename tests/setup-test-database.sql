-- ==========================================
-- SETUP SCRIPT FÖR TEST-DATABAS
-- ==========================================
-- Detta script skapar alla tabeller som behövs för Playwright-tester
-- Kör detta script i Supabase SQL Editor för TEST-projektet
-- 
-- SÄKERHET: Verifiera att du är i TEST-miljön innan du kör!
-- Test Project ID: fujeyujbchgrtaxodvcz
-- 
-- Datum: 2025-12-22
-- Senast uppdaterad: 2025-12-22 (RLS policies för contact_requests)
-- ==========================================

-- ============================================
-- SÄKERHETSKONTROLL
-- ============================================
-- Lägg till en kommentar med ditt projekt-ID för att verifiera
-- att du är i rätt miljö innan du kör scriptet

-- ============================================
-- 1. CUSTOMERS (Kunder/användare)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_customer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS policies för customers
CREATE POLICY "Users can view own profile" ON customers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON customers
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all customers" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all customers" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 2. SERVICE_TYPES (Tjänsttyper)
-- ============================================
CREATE TABLE IF NOT EXISTS service_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lägg till grundläggande tjänsttyper
INSERT INTO service_types (name, description, base_price) VALUES 
('Flyttstäd', 'Komplett städning vid flytt enligt fastighetsägarens krav', 2500),
('Rensning', 'Rensning av hem och fastigheter', 1500),
('Tömning av bohag', 'Tömning av dödsbo eller vid flytt', 3000),
('Avslut av abonnemang', 'Hjälp med att avsluta olika abonnemang och tjänster', 500),
('Magasinering', 'Förvaring av möbler och tillhörigheter', 800),
('Flytt', 'Flytt av möbler och tillhörigheter', 2000),
('Värdering', 'Professionell värdering av föremål', 1000)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. SUBSCRIPTIONS (Abonnemang som kan avbrytas)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lägg till grundläggande abonnemang
INSERT INTO subscriptions (name, provider, category) VALUES 
('Netflix', 'Netflix', 'Streaming'),
('Spotify', 'Spotify', 'Musik'),
('Dagens Nyheter', 'Bonnier News', 'Tidningar'),
('SVT Play', 'SVT', 'Streaming'),
('Expressen', 'Bonnier News', 'Tidningar'),
('HBO Max', 'HBO', 'Streaming'),
('Aftonbladet Plus', 'Schibsted', 'Tidningar'),
('Folksam Hemförsäkring', 'Folksam', 'Försäkring'),
('If Hemförsäkring', 'If', 'Försäkring'),
('Länsförsäkringar', 'Länsförsäkringar', 'Försäkring'),
('Telia Mobil', 'Telia', 'Telekom'),
('Telenor Mobil', 'Telenor', 'Telekom'),
('Tre Mobil', 'Tre', 'Telekom'),
('Tele2 Mobil', 'Tele2', 'Telekom'),
('Vattenfall El', 'Vattenfall', 'El'),
('E.ON El', 'E.ON', 'El'),
('Fortum El', 'Fortum', 'El')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CASES (Ärenden)
-- ============================================
CREATE TABLE IF NOT EXISTS cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  service_type_id UUID REFERENCES service_types(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  total_price DECIMAL(10,2),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- RLS policies för cases
CREATE POLICY "Users can view own cases" ON cases
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all cases" ON cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert cases" ON cases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 5. CASE_SUBSCRIPTIONS (Ärendeabonnemang)
-- ============================================
CREATE TABLE IF NOT EXISTS case_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  cancellation_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE case_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CONTACT_REQUESTS (Kontaktförfrågningar)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  firstname TEXT,
  lastname TEXT,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  service_interest TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'closed')),
  admin_notes TEXT,
  gdpr_consent BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- RLS för contact_requests
-- 1. Anyone (anon + auth) may insert
CREATE POLICY "contact_requests_insert_anyone"
ON contact_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Admins may read
CREATE POLICY "contact_requests_select_admin"
ON contact_requests
FOR SELECT
TO authenticated
USING (is_admin());

-- 3. Admins may update
CREATE POLICY "contact_requests_update_admin"
ON contact_requests
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 4. Admins may delete
CREATE POLICY "contact_requests_delete_admin"
ON contact_requests
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================
-- 7. CASE_COMMENTS (Kommentarer på ärenden)
-- ============================================
CREATE TABLE IF NOT EXISTS case_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  author_id UUID REFERENCES customers(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'admin')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE case_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies för case_comments
CREATE POLICY "Users can view comments on own cases" ON case_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_comments.case_id AND customer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can comment on own cases" ON case_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE id = case_comments.case_id AND customer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 8. STORAGE_ITEMS (Magasinering)
-- ============================================
CREATE TABLE IF NOT EXISTS storage_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  storage_location TEXT,
  status TEXT DEFAULT 'stored' CHECK (status IN ('stored', 'retrieved', 'disposed')),
  stored_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retrieved_date TIMESTAMP WITH TIME ZONE,
  monthly_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE storage_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. VALUATIONS (Värderingar)
-- ============================================
CREATE TABLE IF NOT EXISTS valuations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  image_urls TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;

-- RLS policies för valuations
CREATE POLICY "Users can view own valuations" ON valuations
  FOR SELECT USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all valuations" ON valuations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 10. SUBSCRIPTION_CANCELLATIONS (Uppsägningar)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_cancellations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider TEXT,
  service_type TEXT,
  custom_service_name TEXT,
  notice_period TEXT,
  last_due_date DATE,
  provider_contact TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'waiting_customer', 'waiting_provider', 'cancelled', 'completed')),
  documents TEXT[],
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE subscription_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS policies för subscription_cancellations
CREATE POLICY "Users can view own cancellations" ON subscription_cancellations
  FOR SELECT USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all cancellations" ON subscription_cancellations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 11. CANCELLATION_COMMENTS (Kommentarer på uppsägningar)
-- ============================================
CREATE TABLE IF NOT EXISTS cancellation_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cancellation_id UUID REFERENCES subscription_cancellations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cancellation_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies för cancellation_comments
CREATE POLICY "Users can view comments on own cancellations" ON cancellation_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscription_cancellations 
      WHERE id = cancellation_comments.cancellation_id 
      AND customer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all comments" ON cancellation_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 12. FULLMAKTER (Fullmakter)
-- ============================================
CREATE TABLE IF NOT EXISTS fullmakter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fullmaktsgivare UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fullmakthavare UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  typ TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  giltig_from DATE NOT NULL,
  giltig_tom DATE,
  dokument_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fullmakter ENABLE ROW LEVEL SECURITY;

-- RLS policies för fullmakter
CREATE POLICY "Users can view own fullmakter" ON fullmakter
  FOR SELECT USING (
    fullmaktsgivare = auth.uid() OR 
    fullmakthavare = auth.uid() OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all fullmakter" ON fullmakter
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- 13. ARCHIVED_CUSTOMERS (Arkiverade kunder)
-- ============================================
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
  original_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index för snabb sökning
CREATE INDEX IF NOT EXISTS idx_archived_customers_email ON archived_customers(email);
CREATE INDEX IF NOT EXISTS idx_archived_customers_archived_at ON archived_customers(archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_customers_archived_by ON archived_customers(archived_by);

ALTER TABLE archived_customers ENABLE ROW LEVEL SECURITY;

-- RLS policies för archived_customers
CREATE POLICY "Admins can view archived customers" ON archived_customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert archived customers" ON archived_customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete archived customers" ON archived_customers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- TRIGGERS FÖR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_requests_updated_at ON contact_requests;
CREATE TRIGGER update_contact_requests_updated_at BEFORE UPDATE ON contact_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_valuations_updated_at ON valuations;
CREATE TRIGGER update_valuations_updated_at BEFORE UPDATE ON valuations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_cancellations_updated_at ON subscription_cancellations;
CREATE TRIGGER update_subscription_cancellations_updated_at BEFORE UPDATE ON subscription_cancellations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fullmakter_updated_at ON fullmakter;
CREATE TRIGGER update_fullmakter_updated_at BEFORE UPDATE ON fullmakter
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SLUTKONTROLL
-- ============================================
-- Verifiera att alla tabeller skapades
SELECT 
  schemaname, 
  tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'customers', 
    'service_types', 
    'subscriptions', 
    'cases', 
    'case_subscriptions', 
    'contact_requests', 
    'case_comments', 
    'storage_items', 
    'valuations', 
    'subscription_cancellations', 
    'cancellation_comments', 
    'fullmakter', 
    'archived_customers'
  )
ORDER BY tablename;

-- ============================================
-- SETUP KLART!
-- ============================================
-- Din testdatabas är nu redo för Playwright-tester
-- 
-- Nästa steg:
-- 1. Verifiera att .env.test pekar på detta Supabase-projekt
-- 2. Kör testerna: npm run test
-- ============================================
