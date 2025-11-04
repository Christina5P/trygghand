# Adminpanel Setup - SQL Kommandon

Kör dessa SQL-kommandon i Lovable Cloud (Cloud-fliken) för att sätta upp databasen:

## 1. Skapa Enums

```sql
-- Skapa enum för användarroller
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Skapa enum för kontaktstatus
CREATE TYPE public.contact_status AS ENUM ('new', 'in_progress', 'completed', 'cancelled');
```

## 2. Skapa Tabeller

```sql
-- Skapa profiltabell
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Skapa användarroller-tabell (VIKTIGT: separerad från profiles för säkerhet)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Skapa kontakttabell
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status contact_status DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
```

## 3. Skapa Funktioner

```sql
-- Skapa security definer-funktion för att kolla användarroller
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Skapa funktion för att hantera nya användare
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Funktion för att uppdatera updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

## 4. Skapa Triggers

```sql
-- Trigger för att skapa profil när användare registrerar sig
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger för att uppdatera updated_at på kontakter
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

## 5. Skapa RLS Policies

```sql
-- RLS Policies för profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies för user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies för contacts
CREATE POLICY "Anyone can insert contacts"
  ON public.contacts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all contacts"
  ON public.contacts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contacts"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contacts"
  ON public.contacts
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

## 6. Skapa Din Första Admin-användare

Efter att du skapat ett konto via `/auth`, kör detta för att göra dig själv till admin:

```sql
-- Byt ut 'DIN-EMAIL@EXAMPLE.COM' med din faktiska email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'DIN-EMAIL@EXAMPLE.COM';
```

## Användning

1. **Kontaktformulär**: Gå till `/contacts` för att testa kontaktformuläret
2. **Registrera konto**: Gå till `/auth` och skapa ett konto
3. **Gör dig till admin**: Kör SQL-kommandot ovan för att lägga till admin-roll
4. **Adminpanel**: Gå till `/admin` för att se alla kontaktförfrågningar

## Viktiga funktioner i adminpanelen:

- ✅ Se alla kontaktförfrågningar
- ✅ Statistik över status (nya, pågående, klara)
- ✅ Uppdatera status på ärenden
- ✅ Filtrera och sortera kontakter
- ✅ Säker inloggning med Supabase Auth



tree -a -I "node_modules|.git|dist"