# 🗄️ Setup av Test-databas för Playwright

Detta dokument beskriver hur du skapar och konfigurerar din Supabase test-databas så att den matchar produktionsmiljön.

## 📋 Översikt

Test-databasen ska ha samma struktur som produktionsdatabasen men vara **helt separerad** för att undvika att påverka riktiga användare och data.

## ⚠️ Säkerhet Först

**VIKTIGT**: Verifiera alltid att du är i test-miljön innan du kör SQL-scripts!

- **Test Project ID**: `fujeyujbchgrtaxodvcz`
- **Environment**: `DATABASE_ENV=test` i `.env.test`
- Kontrollera URL:en i Supabase Dashboard

## 🚀 Steg-för-steg Setup

### 1. Skapa Supabase Test-projekt

1. Gå till [Supabase Dashboard](https://supabase.com/dashboard)
2. Klicka på "New Project"
3. Namnge projektet: `trygghand-test`
4. Välj region: `North Europe (Stockholm)` eller närmast dig
5. Generera ett starkt lösenord (spara det säkert!)
6. Klicka "Create new project"

### 2. Konfigurera miljövariabler

Kopiera credentials från ditt test-projekt:

```bash
# I Supabase Dashboard:
# Project Settings > API

SUPABASE_URL=https://fujeyujbchgrtaxodvcz.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

Uppdatera `/workspaces/trygghand/tests/.env.test`:

```env
DATABASE_ENV=test
SUPABASE_URL=https://fujeyujbchgrtaxodvcz.supabase.co
SUPABASE_ANON_KEY=din_anon_key_här
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key_här
```

### 3. Kör Setup-script

Öppna Supabase SQL Editor:

1. Gå till Supabase Dashboard
2. Välj ditt test-projekt
3. Klicka på "SQL Editor" i vänstermenyn
4. Klicka på "New query"
5. Kopiera innehållet från `tests/setup-test-database.sql`
6. Klistra in i SQL Editor
7. Klicka "Run" (eller CMD/CTRL + Enter)

**Scriptet skapar**:
- ✅ 13 databastabeller
- ✅ Row Level Security (RLS) policies
- ✅ Triggers för `updated_at`
- ✅ Indexes för optimerad sökning
- ✅ Grunddata (service types, subscriptions)

### 4. Verifiera setup

Kör verifieringsscriptet:

```bash
# I Supabase SQL Editor, öppna ny query
# Kopiera innehållet från tests/verify-test-database.sql
# Kör scriptet
```

**Förväntat resultat**:
- ✅ 13 tabeller existerar
- ✅ RLS enabled på alla relevanta tabeller
- ✅ Minst 1-3 policies per tabell
- ✅ 6 triggers för `updated_at`
- ✅ 3 indexes på `archived_customers`
- ✅ 7 service types
- ✅ 17 pre-populerade subscriptions

### 5. Testa uppkopplingen

Kör ett enkelt test för att verifiera:

```bash
cd /workspaces/trygghand
npm run test -- tests/system/contact-flow.spec.ts -g "Database - Kontrollera att vi använder TEST-miljö"
```

Detta test kontrollerar:
- ✅ `DATABASE_ENV=test` är satt
- ✅ Supabase URL pekar på test-projektet
- ✅ Inga produktions-credentials används

## 📊 Databasstruktur

### Huvudtabeller

| Tabell | Beskrivning | Används i tester |
|--------|-------------|------------------|
| `customers` | Kunder och användare | ✅ Alla tester |
| `contact_requests` | Kontaktformulär | ✅ contact-flow.spec.ts |
| `cases` | Ärenden | ✅ (planerat) |
| `valuations` | Värderingar | ✅ (planerat) |
| `subscription_cancellations` | Uppsägningar | ✅ (planerat) |
| `service_types` | Tjänsttyper | ✅ Services |
| `subscriptions` | Abonnemang | ✅ (planerat) |
| `case_comments` | Kommentarer på ärenden | - |
| `cancellation_comments` | Kommentarer på uppsägningar | - |
| `storage_items` | Magasinerade föremål | - |
| `fullmakter` | Fullmakter | - |
| `archived_customers` | Arkiverade kunder | - |
| `case_subscriptions` | Koppling ärende-abonnemang | - |

### Viktiga kolumner för tester

#### `contact_requests`
```sql
- id UUID (primary key)
- firstname TEXT
- lastname TEXT
- email TEXT NOT NULL
- phone TEXT
- message TEXT NOT NULL
- status TEXT (new, contacted, quoted, converted, closed)
- created_at TIMESTAMP
```

#### `customers`
```sql
- id UUID (references auth.users)
- email TEXT NOT NULL
- name TEXT NOT NULL
- is_admin BOOLEAN
- is_customer BOOLEAN
- created_at TIMESTAMP
```

## 🔒 Säkerhetsfunktioner

### Row Level Security (RLS)

Alla känsliga tabeller har RLS enabled:

```sql
-- Endast admins kan se kontaktförfrågningar
CREATE POLICY "Admins can manage contact requests" ON contact_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Men vem som helst kan skicka in formulär
CREATE POLICY "Anyone can submit contact requests" ON contact_requests
  FOR INSERT WITH CHECK (true);
```

### Automatisk data-rensning

Test-fixtures rensar automatiskt data efter varje test:

```typescript
// tests/fixtures/supabase.ts
await supabaseService.cleanupContactRequest(testEmail);
```

## 🧪 Testa setup

### Snabbtest
```bash
npm run test -- tests/system/contact-flow.spec.ts -g "Database"
```

### Alla tester
```bash
npm run test
```

### Specifik testfil
```bash
npm run test -- tests/system/navigation.spec.ts
```

## 🛠️ Underhåll

### Rensa test-data manuellt

```sql
-- I Supabase SQL Editor
DELETE FROM contact_requests WHERE email LIKE '%playwright-test%';
DELETE FROM valuations WHERE customer_id IS NULL;
```

### Reset hela databasen

```sql
-- VARNING: Detta raderar ALLT!
-- Kör endast i TEST-miljö

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Kör sedan setup-test-database.sql igen
```

### Uppdatera schema

När du lägger till nya tabeller i produktion:

1. Uppdatera `tests/setup-test-database.sql`
2. Lägg till CREATE TABLE statement
3. Lägg till RLS policies
4. Kör scriptet i test-databasen
5. Uppdatera `tests/verify-test-database.sql`
6. Verifiera att allt fungerar

## 📚 Relaterad dokumentation

- [tests/README.md](./README.md) - Teknisk guide för testning
- [SYSTEM_TESTS_SETUP.md](../SYSTEM_TESTS_SETUP.md) - Setup-instruktioner
- [QUICK_TEST_REFERENCE.md](../QUICK_TEST_REFERENCE.md) - Snabbreferens
- [TEST_SUITE_DOCUMENTATION.md](../TEST_SUITE_DOCUMENTATION.md) - Arkitektur

## ❓ Felsökning

### Problem: "relation does not exist"

**Lösning**: Tabellen saknas. Kör setup-scriptet igen.

```bash
# Kontrollera vilka tabeller som finns
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Problem: "permission denied for table"

**Lösning**: RLS policies saknas eller är fel konfigurerade.

```bash
# Kontrollera RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

# Lista policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Problem: "Failed to fetch"

**Lösning**: Kontrollera credentials i `.env.test`

```bash
# Verifiera att miljövariabler laddas
cat tests/.env.test

# Test uppkoppling med curl
curl https://fujeyujbchgrtaxodvcz.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"
```

### Problem: "Test runs against production"

**Lösning**: Säkerhetscheck aktiverad!

Detta är en **FEATURE**, inte en bug. Testen vägrar köra mot produktion.

Verifiera:
```bash
# I .env.test
DATABASE_ENV=test

# I Supabase URL
SUPABASE_URL=https://fujeyujbchgrtaxodvcz.supabase.co  # TEST project
```

## 🎯 Checklista för Go-Live

Innan du börjar köra tester:

- [ ] Test-projekt skapat i Supabase
- [ ] `.env.test` konfigurerad med test-credentials
- [ ] `setup-test-database.sql` körts utan fel
- [ ] `verify-test-database.sql` visar OK status
- [ ] Säkerhetstest passerar (DATABASE_ENV=test)
- [ ] Minst 1 test körs framgångsrikt

## 💡 Tips

1. **Backup-strategi**: Test-data är tillfällig, men backup av schema är bra
2. **Separata projekt**: Använd alltid separata Supabase-projekt för test/prod
3. **Environment indicators**: Lägg till "TEST" i projektnamn för tydlighet
4. **Automated cleanup**: Fixtures rensar automatiskt, men granska manuellt ibland
5. **CI/CD**: GitHub Actions kör tester automatiskt dagligen

## 📞 Support

Problem med database-setup?

1. Kolla [Troubleshooting](#-felsökning) ovan
2. Läs [Supabase docs](https://supabase.com/docs)
3. Granska error logs i Supabase Dashboard
4. Kontrollera att test-projektet är aktivt

---

**Lycka till med testningen! 🚀**
