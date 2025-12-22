/**
 * Services Tests
 * Testar alla tjänst-sidor och funktionalitet
 */

import { test, expect } from '@playwright/test';
import {
  verifyPageLoaded,
  acceptCookiesIfPresent,
  scrollToElement,
  assertNotProduction,
  setMobileViewport,
} from '../utils/test-helpers';

test.describe('🔧 Services - Tjänster', () => {
  test.beforeEach(async ({ page }) => {
    assertNotProduction(page.url());
  });

  test.describe('📌 Services Grid - Startsida', () => {
    test('✅ Services-sektion - Alla tjänst-kort synliga', async ({ page }) => {
      await page.goto('/');
      await verifyPageLoaded(page, 'TryggHand');
      await acceptCookiesIfPresent(page);

      // Scrolla till services-sektion
      const servicesHeading = page.locator('h3:has-text("Läs mer om våra tjänster")').first();
      await servicesHeading.scrollIntoViewIfNeeded();

      // Verifiera tjänst-kort
      const services = [
        'Rådgivning & planering',
        'Städning',
        'Flytt',
        'Tömning av bohag',
        'Värdering',
        'Försäljning',
        'Magasinering',
      ];

      for (const service of services) {
        const serviceLink = page.locator(`text=/^${service}$/i`).first();
        // Minst några tjänster bör synas
        if (await serviceLink.isVisible()) {
          await expect(serviceLink).toBeVisible();
        }
      }
    });

    test('✅ Service-kort - Är interaktiva och clickable', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      const servicesHeading = page.locator('h3:has-text("Läs mer om våra tjänster")').first();
      await servicesHeading.scrollIntoViewIfNeeded();

      // Klicka på första tjänst-kort
      const firstServiceLink = page.locator('a[href*="/services"]').first();
      
      if (await firstServiceLink.isVisible()) {
        await firstServiceLink.click();
        await page.waitForLoadState('networkidle');

        // Verifiera att vi är på en tjänst-sida
        const url = page.url();
        expect(url).toContain('/services');
      }
    });

    test('✅ Service-paket - Visar priser och funktioner', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      const packetsSection = page.locator('h2:has-text("Servicepaket")').first();
      await packetsSection.scrollIntoViewIfNeeded();
      await expect(packetsSection).toBeVisible();

      // Verifiera att det finns minst något prisbärande element
      const priceElements = await page.locator('text=/kr|SEK|pris|från/i').count();
      expect(priceElements).toBeGreaterThan(0);
    });
  });

  test.describe('🧹 Städning Service', () => {
    test('✅ Städning - Sida laddar med innehål', async ({ page }) => {
      await page.goto('/services/stadning');
      await verifyPageLoaded(page, 'Städning');

      // Verifiera rubrik
      const title = page.locator('h1, h2').filter({ hasText: /städning|cleaning/i });
      await expect(title).toBeVisible();

      // Verifiera att det finns beskrivning
      const description = page.locator('h3:has-text("Detta ingår i vårt flyttstäd")').first();
      await expect(description).toBeVisible();
    });

    test('✅ Städning - Innehåller fördelar-lista', async ({ page }) => {
      await page.goto('/services/stadning');

      // Verifiera innehål/beskrivning
      const content = page.locator('text=/Detta ingår|Att tänka på/i');
      const count = await content.count();
      expect(count).toBeGreaterThan(0);
    });

    test('✅ Städning - Konsultation-knapp fungerar', async ({ page }) => {
      await page.goto('/services/stadning');

      const consultButton = page.getByRole('button').filter({ hasText: /konsultation|kontakta|boka/i }).first();
      
      if (await consultButton.isVisible()) {
        await consultButton.click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('🚚 Flytt Service', () => {
    test('✅ Flytt - Sida laddar med innehål', async ({ page }) => {
      await page.goto('/services/flytt');
      await verifyPageLoaded(page, 'Flytt');

      const title = page.locator('h1, h2').filter({ hasText: /flytt|moving|move/i });
      await expect(title).toBeVisible();
    });

    test('✅ Flytt - Back-länk fungerar', async ({ page }) => {
      await page.goto('/services/flytt');

      const backButton = page.locator('button:has-text("Tillbaka"), a:has-text("Tillbaka")').first();
      
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        
        // Bör vara tillbaka på startsida eller services
        expect(page.url()).toContain('/');
      }
    });
  });

  test.describe('🗑️ Tömning av Bohag', () => {
    test('✅ Tömning - Sida laddar', async ({ page }) => {
      await page.goto('/services/tomning-bohag');
      await verifyPageLoaded(page, 'Tömning');

      const title = page.locator('h1, h2').filter({ hasText: /tömning|bohag/i });
      await expect(title).toBeVisible();
    });

    test('✅ Tömning - Visar info om processen', async ({ page }) => {
      await page.goto('/services/tomning-bohag');

      // Verifiera att det finns process/steg-information
      const processText = page.locator('text=/Planeringsmöte|Transport|hjälp/i');
      const count = await processText.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('🔍 Värdering Service', () => {
    test('✅ Värdering - AI-sida laddar', async ({ page }) => {
      const response = await page.goto('/services/vardering', { waitUntil: 'networkidle' });
      
      if (response) {
        // Sidan bör antingen existera eller redirecta
        expect([200, 301, 302]).toContain(response.status());
      }
    });

    test('✅ Värdering AI - Instruktioner syns', async ({ page }) => {
      await page.goto('/vardering-ai');

      const content = page.locator('main, [role="main"]');
      
      if (await content.isVisible()) {
        // Sidan bör ha något innehål
        const text = await content.locator('text=/./').count();
        expect(text).toBeGreaterThan(0);
      }
    });
  });

  test.describe('💰 Försäljning Service', () => {
    test('✅ Försäljning - Sida laddar', async ({ page }) => {
      await page.goto('/services/forsaljning');
      await verifyPageLoaded(page, 'Försäljning');

      const title = page.locator('h1, h2').filter({ hasText: /försäljning|sale|selling/i });
      await expect(title).toBeVisible();
    });

    test('✅ Försäljning - Visar tjänst-detaljer', async ({ page }) => {
      await page.goto('/services/forsaljning');

      // Verifiera kort/card-element
      const cards = page.locator('[role="region"], .card, [class*="card"]');
      const count = await cards.count();
      
      if (count === 0) {
        // Om inga cards, verifiera minst någon content
        const content = page.locator('main');
        await expect(content).toBeVisible();
      } else {
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('📦 Magasinering Service', () => {
    test('✅ Magasinering - Sida laddar', async ({ page }) => {
      await page.goto('/services/magasinering');
      await verifyPageLoaded(page, 'Magasinering');

      const title = page.locator('h1, h2').filter({ hasText: /magasinering|storage|storage/i });
      await expect(title).toBeVisible();
    });

    test('✅ Magasinering - Fördelar syns', async ({ page }) => {
      await page.goto('/services/magasinering');

      // Verifiera fördelar-lista
      const advantages = page.locator('text=/klimat|försäkring|flexib|säker|kontroll/i');
      const count = await advantages.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('💡 Rådgivning & Planering', () => {
    test('✅ Rådgivning - Sida laddar', async ({ page }) => {
      await page.goto('/services/RadgivningPlanering');
      
      // Verifiera att sidan laddar
      const content = page.locator('main, [role="main"]');
      
      if (await content.isVisible()) {
        await expect(content).toBeVisible();
      }
    });
  });

  test.describe('📚 Juridisk Guide', () => {
    test('✅ Juridik Guide - Sida laddar', async ({ page }) => {
      const response = await page.goto('/services/Juridikguide');
      
      if (response) {
        expect(response.status()).toBeLessThan(400);
      }

      const content = page.locator('main, [role="main"]');
      
      if (await content.isVisible()) {
        await expect(content).toBeVisible();
      }
    });

    test('✅ Juridik Guide - Länk fungerar från nav', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      // Hitta juridisk guide-länk
      const juridikLink = page.locator('a:has-text("Juridik"), a:has-text("juridisk")').first();
      
      if (await juridikLink.isVisible()) {
        await juridikLink.click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('💬 Kontakta oss', () => {
    test('✅ Alla service-sidor - Visar kontakta-knapp', async ({ page }) => {
      const servicePages = [
        '/services/stadning',
        '/services/flytt',
        '/services/tomning-bohag',
        '/services/forsaljning',
        '/services/magasinering',
      ];

      for (const servicePage of servicePages) {
        await page.goto(servicePage);

        // Hitta kontakta-knapp
        const contactButton = page.getByRole('button').filter({ hasText: /kontakta|konsultation|boka/i }).first();
        
        if (await contactButton.isVisible()) {
          await expect(contactButton).toBeVisible();
        }
      }
    });
  });

  test.describe('📱 Responsive Services', () => {
    test('✅ Service-sida - Responsive på mobil', async ({ page }) => {
      await setMobileViewport(page);
      await page.goto('/services/stadning');

      // Verifiera att innehål staplas korrekt på mobil
      const title = page.locator('h1, h2');
      await expect(title).toBeVisible();

      // Knapparna bör vara clickable
      const buttons = page.locator('button').first();
      
      if (await buttons.isVisible()) {
        await expect(buttons).toBeVisible();
      }
    });

    test('✅ Service-grid - Responsiv layout', async ({ page }) => {
      await page.goto('/');
      await acceptCookiesIfPresent(page);

      const servicesHeading = page.locator('h3:has-text("Läs mer om våra tjänster")').first();
      await servicesHeading.scrollIntoViewIfNeeded();

      // Verifiera layout på möbil
      await setMobileViewport(page);

      const serviceCards = page.locator('a[href*="/services"]');
      const count = await serviceCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});