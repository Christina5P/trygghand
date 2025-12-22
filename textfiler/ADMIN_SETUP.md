# ADMIN_SETUP.md

**Projekt:** Trygg Hand – Från beslut till nytt kapitel  
**Syfte:** Fullständig och aktuell setup för admin- och säkerhetsstruktur i Supabase  
**Databas:** PostgreSQL (Supabase)  
**Frontend:** React / Vite / TypeScript  

Detta dokument **ersätter tidigare ADMIN_SETUP.md helt** och speglar den faktiska, reviderade strukturen efter GDPR- och säkerhetsgenomgång.

---

## Översikt

Denna setup bygger på:

- Roll- och ägarbaserad åtkomst
- Row Level Security (RLS) på alla persondatatabeller
- Separata roller (ej hårdkodade i profiler)
- Minsta möjliga privilegier (least privilege)
- GDPR art. 25 & 32 (Privacy by Design)

---

## 1. Grundläggande typer (ENUMS)

```sql
-- Applikationsroller
CREATE TYPE public.app_role AS ENUM ('admin');

-- Status för kontakter
CREATE TYPE public.contact_status AS ENUM ('new', 'in_progress', 'completed', 'cancelled');
```

---

## 2. Kärntabeller

### 2.1 Profiler (kopplad till auth.users)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

---

### 2.2 Roller (SEPARERAD FÖR SÄKERHET)

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

> ⚠️ Roller lagras **inte** i profiler för att minska risk vid dataläckage.

---

### 2.3 Kontakter (kontaktformulär)

```sql
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status contact_status DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
```

---

## 3. Säkerhetsfunktioner

### 3.1 Rollkontroll (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
```

---

### 3.2 Skapa profil automatiskt vid registrering

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
```

---

### 3.3 Automatisk updated_at

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## 4. Triggers

```sql
-- Skapa profil när auth-användare skapas
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Uppdatera updated_at på contacts
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

---

## 5. Row Level Security (RLS)

### 5.1 Profiles

```sql
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);
```

---

### 5.2 User roles (ENDAST ADMIN)

```sql
CREATE POLICY "Admins can view roles"
ON public.user_roles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));
```

---

### 5.3 Contacts

```sql
CREATE POLICY "Anyone can insert contacts"
ON public.contacts
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins read contacts"
ON public.contacts
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update contacts"
ON public.contacts
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete contacts"
ON public.contacts
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));
```

---

## 6. Skapa första admin

⚠️ Körs **endast manuellt** efter att ditt konto skapats via Supabase Auth.

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'DIN-EMAIL@EXEMPEL.SE';
```

---

## 7. Säkerhetsprinciper (sammanfattning)

- ❌ Ingen admin-nyckel i frontend
- ✅ All behörighet styrs i databasen
- ✅ RLS på ALLA tabeller med persondata
- ✅ Roller separerade från profiler
- ✅ Supabase Auth + JWT

---

## 8. Användning i appen

- `/auth` – registrering / login
- Kontaktformulär → `contacts` (anon tillåtet)
- `/admin` – endast användare med admin-roll

Admin kan:
- se alla kontaktförfrågningar
- uppdatera status
- radera ärenden

---

## 9. Full synk mot produktionsdatabas

ADMIN_SETUP.md är nu fullt synkad mot aktuell Supabase-policystruktur och omfattar följande tabeller och åtkomstmönster:

### Applikationsdata (public)
- cases (kundägda ärenden, admin full åtkomst)
- case_comments (ägarskap via case)
- customers (egen profil + admin)
- archived_customers (endast admin)
- subscription_cancellations
- fullmakter
- valuations
- todos

### Kontakt & leads
- contacts
- contact_requests

### Identitet & behörighet
- profiles
- user_roles

### Lagring (storage.objects)
- documents (ägare + admin)
- fullmakts-filer
- abonnemang
- images

Alla ovanstående tabeller är skyddade av:
- aktiverad RLS
- explicita SELECT / INSERT / UPDATE / DELETE policies
- roll- eller ägarbaserade villkor

---

## 10. Policy-principer (standardiserade)

- ❌ Inga "ANY authenticated" SELECT på persondata
- ✅ INSERT kan vara öppen endast där ändamålet kräver det (kontaktformulär)
- ✅ SELECT begränsas alltid via auth.uid() eller admin-roll
- ❌ DELETE tillåts aldrig för slutkund där spårbarhet krävs

---

## 11. Revision

Dokumentet är tekniskt verifierat mot Supabase per 2025-12-21.

Rekommenderad årlig revision eller vid större schemaändring.

**Ansvarig:** Trygg Hand

