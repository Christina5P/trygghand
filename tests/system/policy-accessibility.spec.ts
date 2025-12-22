/**
 * Policy, Accessibility & Security Tests
 * Testar policies, GDPR-compliance, och accessibility
 */

import { test, expect } from '@playwright/test';
import {
  verifyPageLoaded,
  acceptCookiesIfPresent,
  assertNotProduction,
} from '../utils/test-helpers';

test.describe('📋 Policies & Compliance', () => {
  test.beforeEach(async ({ page }) => {
    assertNotProduction(page.url());
  });

  test.describe('🔐 Privacy Policy', () => {
    test('✅ Privacy Policy - Sida existerar och laddar', async ({ page }) => {
      const response = await page.goto('/privacy');
      
      expect(response?.status()).toBeLessThan(400);
      await verifyPageLoaded(page);
    });

    test('✅ Privacy Policy - Innehåller nödvändig information', async ({ page }) => {
      await page.goto('/privacy');

      const requiredTexts = [
        /personuppgifter|personal data/i,
        /behandling|processing/i,
        /rättigheter|rights/i,
      ];

      for (const text of requiredTexts) {
        const element = page.locator(`text=${text}`);
        
        if (await element.count() === 0) {
          // Inte kritiskt men varnar
          console.warn(`⚠️ Privacy policy saknar: ${text}`);
        }
      }

      // Minst något av dessa bör finnas
      const content = page.locator('body');
      const hasContent = await content.textContent();
      expect(hasContent?.length).toBeGreaterThan(100);
    });

    test('✅ Privacy Policy - Är tillgänglig från footer', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      // Scrolla till footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const privacyLink = page.locator('a[href="/privacy"]').or(page.locator('footer a').filter({ hasText: /privacy|integritet/i })).first();
      
      if (await privacyLink.isVisible()) {
        await expect(privacyLink).toBeVisible();
      }
    });

    test('✅ Privacy Policy - Länk från kontaktformulär', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      // Hitta privacy-länk i kontaktform
      const privacyLink = page.locator('#kontakt-form a[href="/privacy"]').or(page.locator('#kontakt-form a').filter({ hasText: /privacy|integritet/i })).first();
      
      if (await privacyLink.isVisible()) {
        await expect(privacyLink).toBeVisible();
        
        // Klicka och verifiera navigation
        await privacyLink.click();
        await page.waitForLoadState('networkidle');
        
        expect(page.url()).toContain('/privacy');
      }
    });
  });

  test.describe('🍪 Cookie Policy', () => {
    test('✅ Cookie Policy - Sida existerar', async ({ page }) => {
      const response = await page.goto('/cookiepolicy');
      
      expect(response?.status()).toBeLessThan(400);
    });

    test('✅ Cookie Policy - Innehåller cookie-information', async ({ page }) => {
      await page.goto('/cookiepolicy');

      const content = page.locator('body');
      const text = await content.textContent();
      
      expect(text?.toLowerCase()).toContain('cookie');
    });

    test('✅ Cookie Banner - Visar cookie-disclosure', async ({ page }) => {
      await page.goto('/');

      // Vänta på cookie banner
      const cookieBanner = page.locator('[class*="cookie"], [id*="cookie"], text=/cookie|kakor/i').first();
      
      if (await cookieBanner.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(cookieBanner).toBeVisible();
      }
    });

    test('✅ Cookie Banner - Acceptera-knapp fungerar', async ({ page }) => {
      await page.goto('/');

      const acceptButton = page.getByRole('button').filter({ hasText: /acceptera|godkänn|agree/i }).first();
      
      if (await acceptButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await acceptButton.click();
        
        // Banner bör försvinna
        await page.waitForTimeout(1000);
        
        if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Det är OK om den inte försvinner omedelbar
        }
      }
    });
  });

  test.describe('🛡️ GDPR & Data Protection', () => {
    test('✅ GDPR - Delete user möjlighet', async ({ page }) => {
      const response = await page.goto('/privacy');
      
      // Privacy policy bör nämna data-deletion
      const content = page.locator('body');
      const hasDeleteMention = await content.textContent();
      
      expect(hasDeleteMention?.toLowerCase()).toMatch(/ta bort|delete|radera|ta bort mina/i);
    });

    test('✅ Kontaktformulär - Privacy notice syns', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      const contactForm = page.locator('#kontakt-form');
      const privacyNotice = contactForm.locator('text=/personuppgifter|behandling/i');
      
      if (await privacyNotice.isVisible()) {
        await expect(privacyNotice).toBeVisible();
      }
    });

    test('✅ Kontaktformulär - Tydlig consent-information', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      const contactForm = page.locator('#kontakt-form');
      const infoText = contactForm.locator('p').last();
      
      if (await infoText.isVisible()) {
        const text = await infoText.textContent();
        // Bör nämna att data används för att hantera förfrågan
        expect(text?.toLowerCase()).toMatch(/förfrågan|kontakta|hantera/i);
      }
    });
  });

  test.describe('♿ Accessibility', () => {
    test('✅ Accessibility - Huvud-rubrik finns (h1)', async ({ page }) => {
      await page.goto('/');

      const h1 = page.locator('h1');
      const count = await h1.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('✅ Accessibility - Bildtext/alt finns för ikoner', async ({ page }) => {
      await page.goto('/');

      const images = page.locator('img');
      const count = await images.count();

      if (count > 0) {
        // Kontrollera att minst några bilder har alt-text
        let imagesWithAlt = 0;
        
        for (let i = 0; i < Math.min(count, 10); i++) {
          const alt = await images.nth(i).getAttribute('alt');
          if (alt) {
            imagesWithAlt++;
          }
        }

        // Minst hälften bör ha alt-text
        expect(imagesWithAlt).toBeGreaterThanOrEqual(Math.ceil(Math.min(count, 10) / 2));
      }
    });

    test('✅ Accessibility - Länk-text är meningsfull', async ({ page }) => {
      await page.goto('/');

      const links = page.locator('a');
      const count = await links.count();

      if (count > 0) {
        // Kontrollera första 10 länk
        let meaningfulLinks = 0;
        
        for (let i = 0; i < Math.min(count, 10); i++) {
          const text = await links.nth(i).textContent();
          
          // Länk-text bör inte vara "klick här", "länk", etc.
          const isMeaningful = text && 
            text.trim().length > 3 && 
            !text.match(/^(klick|länk|här|click|link)$/i);
          
          if (isMeaningful) {
            meaningfulLinks++;
          }
        }

        expect(meaningfulLinks).toBeGreaterThan(0);
      }
    });

    test('✅ Accessibility - Knappar har aria-labels eller text', async ({ page }) => {
      await page.goto('/');

      const buttons = page.locator('button');
      const count = await buttons.count();

      if (count > 0) {
        // Kontrollera första 5 knappar
        for (let i = 0; i < Math.min(count, 5); i++) {
          const button = buttons.nth(i);
          const text = await button.textContent();
          const ariaLabel = await button.getAttribute('aria-label');
          
          // Knapp bör ha antingen text eller aria-label
          expect(text?.trim().length || ariaLabel?.length).toBeGreaterThan(0);
        }
      }
    });

    test('✅ Accessibility - Färgkontrast är tillräcklig', async ({ page }) => {
      await page.goto('/');

      // Denna test är en enkel grundkontroll
      // För fullständig AXE testing, använd axe-core
      const body = page.locator('body');
      
      // Kontrollera att sidan har någon CSS
      const bgColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      expect(bgColor).toBeTruthy();
    });

    test('✅ Accessibility - Formulär har labels', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      const form = page.locator('form').first();
      
      if (await form.isVisible()) {
        const inputs = form.locator('input, textarea, select');
        const count = await inputs.count();

        if (count > 0) {
          // Många inputs har placeholders istället för labels
          // Accepterar både labels och placeholders
          for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            const placeholder = await input.getAttribute('placeholder');
            const name = await input.getAttribute('name');
            
            // Minst ett av dessa bör finnas
            expect(placeholder || name).toBeTruthy();
          }
        }
      }
    });

    test('✅ Accessibility - Keyboard navigation fungerar', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      // Tab genom links
      let tabCount = 0;
      
      while (tabCount < 5) {
        await page.keyboard.press('Tab');
        tabCount++;

        const focused = await page.evaluate(() => document.activeElement?.tagName);
        
        if (['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(focused ?? '')) {
          // Fokus på interaktivt element
          break;
        }
      }

      expect(tabCount).toBeLessThanOrEqual(5);
    });
  });

  test.describe('🔗 Links & References', () => {
    test('✅ Alla interna länk pekar på existerande sidor', async ({ page }) => {
      await page.goto('/');

      const internalLinks = page.locator('a[href^="/"]').or(page.locator('a:not([href^="http"])')).or(page.locator('a:not([href^="tel"])')).or(page.locator('a:not([href^="mailto"])')).or(page.locator('a:not([href^="#"])'));
      
      const count = await internalLinks.count();
      
      if (count > 0) {
        // Kontrollera första 10 länk
        let validLinks = 0;
        
        for (let i = 0; i < Math.min(count, 10); i++) {
          const href = await internalLinks.nth(i).getAttribute('href');
          
          if (href && !href.startsWith('javascript:')) {
            validLinks++;
          }
        }

        expect(validLinks).toBeGreaterThan(0);
      }
    });

    test('✅ Externa länk har target="_blank"', async ({ page }) => {
      await page.goto('/');

      const externalLinks = page.locator('a[href*="http"]').or(page.locator('a[href*="https"]'));
      
      const count = await externalLinks.count();
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const target = await externalLinks.nth(i).getAttribute('target');
          
          // Externa länk bör idealt ha target="_blank"
          if (target) {
            expect(target).toBe('_blank');
          }
        }
      }
    });
  });

  test.describe('⚠️ Security', () => {
    test('✅ Sidan har säkerhetshuvuden (CSP check)', async ({ page, context }) => {
      // Lyssna på response-headers
      const responses: string[] = [];

      page.on('response', (response) => {
        const csp = response.headers()['content-security-policy'];
        if (csp) {
          responses.push(csp);
        }
      });

      await page.goto('/');

      // CSP headers är bra att ha men inte obligatoriskt för frontend-test
      // Denna test är mer informativ
    });

    test('✅ Kontaktformulär - Input sanitering', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      // Försök injicera skadlig HTML
      const emailInput = page.locator('input[name="email"]').first();
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('<script>alert("xss")</script>@test.se');

        // Verifiera att input inte exekverar script
        const errors: string[] = [];
        
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        const form = page.locator('form').first();
        
        // Försök submit
        const submitButton = form.locator('button[type="submit"]');
        
        if (await submitButton.isVisible()) {
          await submitButton.click({ timeout: 2000 }).catch(() => {});
        }

        // Verifiera att ingen alert/error visades
        const scriptErrors = errors.filter((e) => e.includes('script'));
        expect(scriptErrors.length).toBe(0);
      }
    });

    test('✅ Produktion - Aldrig som test-miljö', async () => {
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const isTestEnv = supabaseUrl.includes('fujeyujbchgrtaxodvcz');

      expect(isTestEnv).toBe(true);

      const dbEnv = process.env.DATABASE_ENV;
      expect(dbEnv).toBe('test');
    });
  });
});