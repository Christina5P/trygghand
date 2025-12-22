# ✅ Database Setup Checklista

Använd denna checklista när du sätter upp test-databasen för första gången.

## 📋 Pre-Setup

- [ ] Node.js installerat (v18+)
- [ ] npm/pnpm installerat
- [ ] Playwright installerat (`npx playwright install`)
- [ ] Git repository klonat
- [ ] Supabase-konto skapat

## 🗄️ Supabase Test-Projekt

- [ ] Loggat in på [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Klickat "New Project"
- [ ] Namngivit projekt: `trygghand-test` eller liknande
- [ ] Valt region: **North Europe (Stockholm)**
- [ ] Genererat starkt lösenord (sparat säkert!)
- [ ] Väntat på att projektet blir klart (~2 minuter)
- [ ] Noterat Project Reference ID (finns i URL)

## 🔑 API Credentials

Gå till: **Project Settings** > **API**

- [ ] Kopierat **Project URL**
  - Exempel: `https://fujeyujbchgrtaxodvcz.supabase.co`
- [ ] Kopierat **anon public** key
  - Börjar med: `eyJ...`
- [ ] Kopierat **service_role** key (HEMLIG!)
  - Börjar med: `eyJ...`

## ⚙️ Environment Configuration

```bash
# I terminal:
cd /workspaces/trygghand/tests
cp .env.test.example .env.test
```

Redigera `.env.test`:

- [ ] Satt `DATABASE_ENV=test`
- [ ] Fyllt i `SUPABASE_URL` (från steg ovan)
- [ ] Fyllt i `SUPABASE_ANON_KEY` (från steg ovan)
- [ ] Fyllt i `SUPABASE_SERVICE_ROLE_KEY` (från steg ovan)
- [ ] Satt `BASE_URL=http://localhost:5173`
- [ ] Verifierat att `.env.test` INTE är i git (`.gitignore`)

## 🔍 Verifiera Configuration

```bash
# Kör helper-scriptet
./tests/scripts/setup-database.sh
```

- [ ] Scriptet visar ✅ för `DATABASE_ENV=test`
- [ ] Scriptet visar ✅ för `SUPABASE_URL`
- [ ] Scriptet visar ✅ för `SUPABASE_ANON_KEY`
- [ ] Inga röda error-meddelanden

## 🗄️ Skapa Database Schema

I Supabase Dashboard:

- [ ] Klickat på **SQL Editor** (vänster-meny)
- [ ] Klickat **"New query"**
- [ ] Öppnat filen: `tests/setup-test-database.sql`
- [ ] Kopierat ALLT innehåll (CMD/CTRL + A)
- [ ] Klistrat in i SQL Editor
- [ ] Klickat **"Run"** (eller CMD/CTRL + Enter)
- [ ] Väntat tills query är klar (~5 sekunder)
- [ ] Inget error-meddelande visades

### Förväntat Resultat:
```
Success. No rows returned
```

## ✅ Verifiera Database

I Supabase SQL Editor:

- [ ] Öppnat ny query
- [ ] Kopierat innehållet från: `tests/verify-test-database.sql`
- [ ] Klistrat in och kört (Run)
- [ ] Verifierat resultat:
  - [ ] **13 tabeller** existerar
  - [ ] **RLS enabled** på alla tabeller
  - [ ] **Policies** finns (minst 1-3 per tabell)
  - [ ] **6 triggers** för updated_at
  - [ ] **3 indexes** på archived_customers
  - [ ] **7 service_types** pre-loaded
  - [ ] **17 subscriptions** pre-loaded

## 🧪 Testa Uppkopplingen

Kör säkerhetstestet:

```bash
cd /workspaces/trygghand
npm run test -- tests/system/contact-flow.spec.ts -g "Database"
```

- [ ] Test körs utan fel
- [ ] Visar: `DATABASE_ENV = test`
- [ ] Visar: Test Supabase project ID
- [ ] Test **PASSERAR** ✅

## 🚀 Kör Alla Tester

```bash
npm run test
```

- [ ] Alla tester startar
- [ ] Inga connection errors
- [ ] Minst 1 test passerar
- [ ] Test-data rensas automatiskt

## 📖 Dokumentation Review

- [ ] Läst: `tests/DATABASE_SETUP.md`
- [ ] Läst: `tests/README.md`
- [ ] Bekant med: `SYSTEM_TESTS_SETUP.md`
- [ ] Sparat: `QUICK_TEST_REFERENCE.md` som bokmärke

## 🎯 Final Checks

- [ ] Kan köra: `npm run test` utan fel
- [ ] Kan se test-resultat i terminal
- [ ] Test-data syns INTE i produktion-databasen
- [ ] `.env.test` innehåller TEST-credentials
- [ ] Backup av `.env.test` sparat säkert (ej i git!)

## 🔒 Säkerhetskontroll

- [ ] `DATABASE_ENV=test` är satt
- [ ] Test-projekt är SEPARAT från produktion
- [ ] Inga production-credentials i test-filer
- [ ] `.env.test` är i `.gitignore`
- [ ] Service Role Key är HEMLIG

## 🎉 Klart!

Grattis! Din test-databas är nu uppsatt och redo att användas.

### Nästa Steg:

1. **Kör tester lokalt:**
   ```bash
   npm run test
   ```

2. **Debugga specifika tester:**
   ```bash
   npx playwright test --debug
   ```

3. **Se test-rapport:**
   ```bash
   npx playwright show-report
   ```

4. **Lägg till fler tester:**
   - Se exempel i `tests/system/`
   - Använd helpers från `tests/utils/test-helpers.ts`

## 📞 Hjälp Behövs?

**Felsökning:**
- Läs: `tests/DATABASE_SETUP.md` → Felsökning-sektionen
- Kolla: Supabase logs i Dashboard
- Verifiera: `.env.test` credentials

**Testfel:**
- Kör: `npx playwright test --headed` (se i browser)
- Kolla: `playwright-report/` för detaljer
- Använd: `--debug` för steg-för-steg debugging

---

**Checklista version:** 1.0  
**Datum:** 2025-12-19  
**Uppdaterad:** När database schema ändras
