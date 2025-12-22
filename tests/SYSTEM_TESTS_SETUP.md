# 🧪 System Test Setup Guide

## Snabbstart

Systemtester är redan **installerade och konfigurerade**. Här är vad som är gjort och hur du använder det:

### ✅ Redan Implementerat

- ✅ Playwright installerad
- ✅ Test-struktur skapad
- ✅ Test-miljö konfigurerad
- ✅ Supabase-fixtures (cleanup automatisk)
- ✅ GitHub Actions CI/CD
- ✅ Test-helpers & utilities

### 🚀 Köra Tester

```bash
# Alla tester
npm run test

# Eller explicit
npx playwright test

# Enkel test-fil
npx playwright test tests/system/contact-flow.spec.ts

# Med debug
npx playwright test --debug

# Med HTML-rapport
npx playwright test && npx playwright show-report
```

## 📋 Test-sammansättning

### 1️⃣ Contact Flow (`contact-flow.spec.ts`)
**Vad testas:** Kontaktformulär end-to-end

```bash
npx playwright test tests/system/contact-flow.spec.ts
```

Tests inkluderar:
- Navigering till kontakt-formulär
- Fylla & skicka formulär
- Supabase data-sparning
- Form-validering
- E-post validering
- Responsiv design
- Privacy-policy länk
- Automatisk cleanup

### 2️⃣ Navigation (`navigation.spec.ts`)
**Vad testas:** Hela sidan-navigation

```bash
npx playwright test tests/system/navigation.spec.ts
```

Tests inkluderar:
- Startsida-sektion loading
- Meny-navigation (desktop & mobil)
- Service-länk
- Footer-länk
- Protected routes
- 404-handling
- Externa länk

### 3️⃣ Services (`services.spec.ts`)
**Vad testas:** Alla service-sidor

```bash
npx playwright test tests/system/services.spec.ts
```

Tests inkluderar:
- Service-grid på startsida
- Alla service-sidor (Städning, Flytt, osv)
- Service-detaljer
- Responsiv layout
- Back-navigation

### 4️⃣ Policy & Accessibility (`policy-accessibility.spec.ts`)
**Vad testas:** Compliance & accessibility

```bash
npx playwright test tests/system/policy-accessibility.spec.ts
```

Tests inkluderar:
- Privacy Policy
- Cookie Policy
- GDPR-compliance
- Accessibility (A11y)
- Keyboard navigation
- Alt-text för bilder
- Security (XSS-prevention)
- Säkerhet: Produktion-check

## 🔐 SÄKERHET - VIKTIG INFO

### ✅ Test-miljö är SÄKER

```bash
# Dessa är TEST-credentials (INTE produktion)
SUPABASE_URL=https://fujeyujbchgrtaxodvcz.supabase.co  # Test-projekt
DATABASE_ENV=test                                       # Test-databas
```

### ⚠️ Säkerhet-Mekanismer
1. **Varje test** verifierar vi INTE är på produktion:
   ```typescript
   assertNotProduction(page.url());
   supabaseService.verifyTestEnvironment();
   ```

2. **Automatisk test-data cleanup** - Du behöver inte rensa manuellt:
   ```typescript
   // Automatisk cleanup efter varje test
   await supabaseService.cleanupContactRequest(testEmail);
   ```

3. **GitHub Actions environment** - CI/CD verifierar test-miljö före körning

## 📊 HTML-Rapport

Efter test-körning:

```bash
# Öppna interaktiv HTML-rapport
npx playwright show-report

# Eller sök i mappen
open playwright-report/index.html
```

Rapporten visar:
- Alla test-resultat
- Pass/Fail breakdown
- Screenshots från failed tests
- Test duration
- Browser coverage (Chrome, Firefox, Safari)

## 🐛 Debugging

### Interaktiv Debug-Mode
```bash
npx playwright test --debug
```

Ger tillgång till:
- Playwright Inspector
- Step-through debugging
- DOM inspection
- Network monitoring

### Screenshot för Debugging
```typescript
const path = await takeDebugScreenshot(page, 'contact-form', 'after-submit');
```

Sparas i `test-results/` och uploadades vid CI-fel

### Verbose Output
```bash
npx playwright test --verbose
```

## 🔧 Konfiguration

### playwright.config.ts
Huvudkonfigurationen ligger i root:
- `testDir: './tests'` - Test-mapp
- `fullyParallel: true` - Parallell körning
- `retries: 0` (lokal), `2` (CI) - Retry-policy
- `timeout: 30000` - 30s per test

### .env.test
Test-miljö-variabler:
- `DATABASE_ENV=test` - Tvingar test-databas
- `SUPABASE_URL` - Test Supabase projekt
- `SUPABASE_ANON_KEY` - Test API-nyckel

## 📈 Utöka Test-Suite

### Lägg till ny test-fil
```typescript
// tests/system/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { assertNotProduction } from '../utils/test-helpers';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    assertNotProduction(page.url()); // VIKTIGT: Säkerhet-check
  });

  test('✅ Test name', async ({ page }) => {
    await page.goto('/');
    // ... test logic
  });
});
```

### Lägg till test i befintlig fil
```typescript
test.describe('Contact Form', () => {
  // Existing tests...

  test('✅ Ny test', async ({ page }) => {
    // ...
  });
});
```

### Använd Test Helpers
```typescript
import {
  generateTestEmail,
  acceptCookiesIfPresent,
  scrollToElement,
  fillForm,
  assertNotProduction,
} from '../utils/test-helpers';
```

## 🚀 CI/CD Pipeline

### GitHub Actions (`.github/workflows/playwright.yml`)

**Triggers:**
- 🟢 Push till `main`/`develop`
- 🟡 Pull Request
- ⏰ Daglig schedule (02:00 UTC)
- 🟣 Manuell trigga (workflow_dispatch)

**Steps:**
1. Checkout kod
2. Setup Node.js
3. Install dependencies
4. Install Playwright browsers
5. **Säkerhet-check** - Verifiera test-miljö
6. Build app
7. Kör tests
8. Upload HTML-rapport
9. Upload screenshots (om failed)

## 📝 Bästa Praxis

### ✅ Do's
- Använd `generateTestEmail()` för unik data
- Anropa `assertNotProduction()` i `beforeEach`
- Vänta på `networkidle` efter navigation
- Använd hjälp-funktioner från `test-helpers.ts`
- Rensa test-data (automatisk med fixtures)

### ❌ Don'ts
- Hardkoda e-post/telefon
- Testa mot produktion (kommer misslyckas)
- Använd fixed `waitForTimeout()` (använd waitForSelector istället)
- Glömma säkerhet-checks

## 🆘 Felsökning

### "Element not found"
```bash
# 1. Ta screenshot
const path = await takeDebugScreenshot(page, 'test-name', 'step');

# 2. Använd debug-läge
npx playwright test --debug

# 3. Verifiera selector
page.locator('button:has-text("Skicka")').click()
```

### "Timeout"
```bash
# 1. Öka timeout
test.setTimeout(60000);

# 2. Verifiera element syns
await page.waitForSelector('button', { timeout: 10000 });
```

### "Test kör mot produktion"
```
❌ SÄKERHETSFEL! 
✅ Lösning: Verifiera .env.test är laddad
echo $DATABASE_ENV  # Bör vara "test"
echo $SUPABASE_URL  # Bör innehålla "fujeyujbchgrtaxodvcz"
```

## 📚 Dokumentation

- [Playwright Official Docs](https://playwright.dev/)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- Lokal guide: [tests/README.md](./tests/README.md)

## 💬 Nästa Steg

1. **Köra tester lokalt**
   ```bash
   npm run test
   npx playwright show-report
   ```

2. **Lägga till fler tests** för ny funktionalitet
3. **Monitoring** av CI/CD pipeline
4. **Integration** med PR-reviews

---

**Status:** ✅ Systemtester är fullt konfigurerade och klara att användas!

Några frågor? Kolla [tests/README.md](./tests/README.md) för detaljerad guide.
