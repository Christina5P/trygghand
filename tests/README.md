# 🧪 Playwright System Test Guide

Komplett test-suite för TryggHand-applikationen. Testar hela user-flödet från navigering till form-submission.

## 📋 Oversikt

| Test Suite | Syfte | Täckning |
|-----------|-------|----------|
| **contact-flow.spec.ts** | Kontaktformulär end-to-end | Form-submit, Supabase, validering |
| **navigation.spec.ts** | Navigation & sektioner | Meny, links, routing |
| **services.spec.ts** | Service-sidor | Alla tjänst-sidor, responsiv |
| **policy-accessibility.spec.ts** | Policy & accessibility | GDPR, cookies, tillgänglighet |
| **price-calculator.spec.ts** | Prisberäknare | Kvm-input, prisberäkning, RUT/VAT |
| **portal-dashboard.spec.ts** | Portal diagram & statistik | CircularProgressbar, status, procent |
| **auth-flow.spec.ts** | Autentisering & inloggning | Login, logout, session, guards |
| **status-changes.spec.ts** | Statusändringar | Ärenden, abonnemang, kontakter, uppsägningar |
| **customer-management.spec.ts** | Kundhantering | Aktivera, deaktivera, arkivera, återställa |

## 🚀 Quick Start

### Databas Setup (FÖRSTA GÅNGEN)
```bash
# 1. Skapa test-databas i Supabase
# 2. Kör setup-scriptet (se DATABASE_SETUP.md)
# 3. Konfigurera .env.test med test-credentials
```

📖 **Läs [DATABASE_SETUP.md](./DATABASE_SETUP.md) för komplett guide!**

### Installation
```bash
# Redan gjord - Playwright är installerat
npm install

# Installera Playwright-browsers (om behövs)
npx playwright install
```

### Köra alla tests
```bash
# Kör alla tests
npm run test

# Eller med Playwright-kommando
npx playwright test

# Kör enbart system-tests
npx playwright test tests/system/
```

### Köra specifik test-fil
```bash
# Bara contact-flow
npx playwright test tests/system/contact-flow.spec.ts

# Bara services
npx playwright test tests/system/services.spec.ts
```

### Köra specifik test
```bash
# Enkel test
npx playwright test -g "Kontaktformulär sparas"

# Test-suite
npx playwright test -g "Contact Form"
```

### Debug & Watch Mode
```bash
# Interaktiv debug-läge (Playwright Inspector)
npx playwright test --debug

# Watch-läge (omstart på fil-ändringar)
npx playwright test --watch

# Verbose output
npx playwright test --verbose
```

### HTML Test Report
```bash
# Köra tester med HTML-rapport
npx playwright test

# Öppna rapporten
npx playwright show-report
```

## 🔐 Miljö & Säkerhet

### Test Environment Variables
Se [.env.test](../.env.test):
- ✅ `DATABASE_ENV=test` - Säkerställer test-databas
- ✅ `SUPABASE_URL` - Test Supabase projekt
- ✅ `SUPABASE_ANON_KEY` - Test API-nyckel
- ⚠️ **ALDRIG** produktions-credentials

### Säkerhet - Checkpoints
```typescript
// Varje test validerar att vi INTE är på produktion
assertNotProduction(page.url());
supabaseService.verifyTestEnvironment();
```

## 📦 Test-struktur

```
tests/
├── .env.test                 # Test-miljö-variabler
├── system/                   # System-tests
│   ├── contact-flow.spec.ts        # Kontaktformulär
│   ├── navigation.spec.ts          # Navigation
│   ├── services.spec.ts            # Tjänster
│   └── policy-accessibility.spec.ts  # Policies & accessibility
├── utils/
│   └── test-helpers.ts       # Återanvändbar test-logic
└── fixtures/
    └── supabase.ts           # Supabase-fixtures & cleanup
```

## 🛠️ Test-utilities

### Vanliga hjälp-funktioner

```typescript
import {
  generateTestEmail,           // test_1234567890@test.se
  generateTestPhone,           // 070-xxxx
  fillForm,                    // Fylla form med data
  acceptCookiesIfPresent,      // Acceptera cookie-banner
  scrollToElement,             // Scrolla till element
  assertNotProduction,         // Säkerhet: Check produktion
  verifyPageLoaded,            // Verifiera sida laddad
} from '../utils/test-helpers';
```

### Supabase Fixtures

```typescript
import { test, SupabaseTestService } from '../fixtures/supabase';

test('my test', async ({ supabaseClient, testData }) => {
  // supabaseClient: Supabase-klient
  // testData: Auto-cleanup container
  
  const service = new SupabaseTestService(supabaseClient);
  await service.verifyTestEnvironment(); // Säkerhet-check
  
  // Data rensas automatiskt efter test
});
```

## 📊 Test-täckning

### Contact Form Tests
- ✅ Fylla & skicka formulär
- ✅ Supabase integration
- ✅ Form-validering
- ✅ E-post validering
- ✅ Responsiv design
- ✅ Form reset efter submit
- ✅ Privacy-länk

### Navigation Tests
- ✅ Startsida & sektioner
- ✅ Meny-navigation
- ✅ Service-länk
- ✅ Footer-länk
- ✅ Responsiv meny (desktop/mobil)
- ✅ Protected routes
- ✅ 404-handling

### Services Tests
- ✅ Service-grid
- ✅ Alla service-sidor
- ✅ Service-detaljer
- ✅ Kontakta-knapp
- ✅ Back-navigation
- ✅ Responsiv layout

### Policy & Accessibility Tests
- ✅ Privacy policy
- ✅ Cookie policy
- ✅ GDPR compliance
- ✅ Accessibility (A11y)
- ✅ Keyboard navigation
- ✅ Alt-text
- ✅ Security (XSS-check)

## 🐛 Debugging

### Screenshots
```typescript
// Ta debug-screenshot
const path = await takeDebugScreenshot(page, 'test-name', 'step1');
console.log(`Screenshot: ${path}`);
```

### Console Logs
```typescript
// Fånga console-messages
await captureConsoleLogs(page, (type, msg) => {
  console.log(`[${type}] ${msg}`);
});
```

### Inspect Element
```bash
# Öppna Playwright Inspector
npx playwright test --debug

# Eller i test:
await page.pause(); // Pausar testen, kan inspektera
```

## 🔄 CI/CD Integration

### GitHub Actions
Se [.github/workflows/playwright.yml](../../.github/workflows/playwright.yml):
- Körs på push & PR
- Rapporterar resultat
- Sparar artifacts (HTML-report, screenshots)

### Lokal pre-commit hook
```bash
# Kör tests före commit
npm run test -- --maxWorkers=1
```

## ⚙️ Konfiguration

### playwright.config.ts
```typescript
export default defineConfig({
  testDir: './tests',          // Test-mapp
  fullyParallel: true,         // Kör tests parallellt
  workers: undefined,          // Auto-antal workers
  reporter: 'html',            // HTML-rapport
  retries: 0,                  // Nej retry lokalt (ja på CI)
  timeout: 30000,              // Test timeout
  use: {
    trace: 'on-first-retry',   // Spara trace vid fail
  },
  webServer: {
    command: 'npm run start',
    url: process.env.TEST_BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
```

## 🚨 Common Issues

### Problem: Tests timeout
```
Solution:
- Öka timeout: test.setTimeout(60000)
- Verifiera nätverks-anslutning
- Se om servern kör: npm run dev
```

### Problem: Element not found
```
Solution:
- Kontrollera selector är rätt
- Använd waitForElementWithRetry() för flaky elements
- Ta debug-screenshot
```

### Problem: Database-fel
```
Solution:
- Verifiera .env.test är laddad
- Kontrollera SUPABASE_URL & API-key
- Kör: npx playwright test -- --debug
```

### Problem: Cookie-banner gömmer element
```
Solution:
- acceptCookiesIfPresent() anropas automatiskt
- Eller: await page.evaluate(() => document.cookie = ...)
```

## 📈 Best Practices

### ✅ Do's
- ✅ Använd `generateTestEmail()` för unika test-data
- ✅ Anropa `acceptCookiesIfPresent()` tidigt
- ✅ Alltid `assertNotProduction()` i beforeEach
- ✅ Rensa test-data i teardown (auto med fixtures)
- ✅ Använd semantiska selectors: `[href="/privacy"]` > `button[id="btn1"]`
- ✅ Vänta på `networkidle` efter navigation

### ❌ Don'ts
- ❌ Hardcoda e-post/data
- ❌ Testa mot produktion
- ❌ Vänta med fixed `waitForTimeout(2000)`
- ❌ Använda `/click()` utan att verifiera element är clickable
- ❌ Förlita dig på CSS-selectors som är statiska
- ❌ Glömma att rensa test-data

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Selectors](https://playwright.dev/docs/selectors)
- [Fixtures](https://playwright.dev/docs/fixtures)

## 🤝 Contribution

Att lägga till nya tests:

1. Skapa ny test-fil eller lägg till i existerande
2. Använd test-helpers & fixtures
3. Verifiera att `assertNotProduction()` körs
4. Testa lokalt: `npm run test`
5. Verifiera HTML-rapport: `npx playwright show-report`

## 📞 Support

Problem? 
- Kolla [Playwright troubleshooting](https://playwright.dev/docs/troubleshooting)
- Kör med `--debug` flag
- Se HTML-rapporten för screenshots/traces
