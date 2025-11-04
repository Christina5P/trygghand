-- Skapa tabeller för Trygg Hand systemet
-- Kör dessa kommandon i Supabase SQL Editor

-- 1. Kunder/användare (extends auth.users)
CREATE TABLE customers (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tjänsttyper
CREATE TABLE service_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Abonnemang som kan avbrytas
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ärenden
CREATE TABLE cases (
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

-- 5. Ärendeabonnemang (kopplar ärenden till abonnemang som ska avbrytas)
CREATE TABLE case_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  cancellation_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Kontaktförfrågningar
CREATE TABLE contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_interest TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Kommentarer på ärenden
CREATE TABLE case_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  author_id UUID REFERENCES customers(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'admin')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Magasinering
CREATE TABLE storage_items (
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

-- Sätta upp RLS (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

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

-- RLS för contact_requests (endast admins kan se)
CREATE POLICY "Admins can manage contact requests" ON contact_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Lägg till grundläggande tjänsttyper
INSERT INTO service_types (name, description, base_price) VALUES 
('Flyttstäd', 'Komplett städning vid flytt enligt fastighetsägarens krav', 2500),
('Rensning', 'Rensning av hem och fastigheter', 1500),
('Tömning av bohag', 'Tömning av dödsbo eller vid flytt', 3000),
('Avslut av abonnemang', 'Hjälp med att avsluta olika abonnemang och tjänster', 500),
('Magasinering', 'Förvaring av möbler och tillhörigheter', 800),
('Flytt', 'Flytt av möbler och tillhörigheter', 2000),
('Värdering', 'Professionell värdering av föremål', 1000);

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
('Fortum El', 'Fortum', 'El');

-- Skapa trigger för updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_requests_updated_at BEFORE UPDATE ON contact_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();