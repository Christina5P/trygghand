/**
 * Test Helpers & Utilities
 * Återanvändbar funktionalitet för alla systemtester
 */

import { Page, expect } from '@playwright/test';

/**
 * Generera unique email för test-data
 * Format: test_playwright_TIMESTAMP@test.se
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test_playwright_${timestamp}_${random}@test.se`;
}

/**
 * Generera test-telefonnummer
 */
export function generateTestPhone(): string {
  const randomPart = Math.floor(Math.random() * 9000) + 1000;
  return `070-${randomPart}`;
}

/**
 * Vänta på element och kontrollera att det är synligt
 */
export async function waitForElementAndCheck(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
  const element = await page.locator(selector);
  await expect(element).toBeVisible();
}

/**
 * Scrolla till element och kolla att det syns
 */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  await expect(element).toBeInViewport();
}

/**
 * Fylla i form med data
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(formData)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"]`);
    await input.fill(value);
  }
}

/**
 * Acceptera cookies (om banner syns)
 */
export async function acceptCookiesIfPresent(page: Page): Promise<void> {
  const cookieButton = page.locator('button:has-text("Acceptera"), button:has-text("Godkänn")');
  
  // Kolla om den syns och clickable
  if (await cookieButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieButton.click();
    await page.waitForTimeout(500); // Vänta på cookie-animering
  }
}

/**
 * Verifiera att sida har laddats utan errors
 */
export async function verifyPageLoaded(page: Page, title?: string): Promise<void> {
  // Kolla att sidan är ready
  await page.waitForLoadState('networkidle');
  
  // Kolla för JS errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  if (title) {
    // Accept both "Trygg Hand" and "TryggHand"
    const titlePattern = title.replace(/TryggHand/gi, 'Trygg\\s*Hand');
    await expect(page).toHaveTitle(new RegExp(titlePattern, 'i'));
  }
}

/**
 * Kontrollera att element innehåller text
 */
export async function expectElementContainsText(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toContainText(text);
}

/**
 * Klicka på länk och vänta på navigation
 */
export async function clickLinkAndWait(
  page: Page,
  selector: string,
  navigationTimeout = 3000
): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ timeout: navigationTimeout }).catch(() => {}),
    page.locator(selector).click(),
  ]);
}

/**
 * Validera e-postadress
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Kontrollera att vi INTE är på produktionsmiljön
 */
export function assertNotProduction(url = 'http://localhost'): void {
  const productionDomains = ['trygghand.com', 'www.trygghand.com'];
  const isProduction = productionDomains.some((domain) =>
    new URL(url).hostname.includes(domain)
  );

  if (isProduction) {
    throw new Error(
      `❌ SÄKERHETSFEL: Försök att köra test mot PRODUKTION (${url})! ` +
      `Använd enbart test/dev-miljö.`
    );
  }
}

/**
 * Vänta på element med retry-logik
 */
export async function waitForElementWithRetry(
  page: Page,
  selector: string,
  maxRetries = 3,
  delayMs = 1000
): Promise<void> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return;
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await page.waitForTimeout(delayMs);
      }
    }
  }

  throw lastError || new Error(`Element ${selector} inte funnet efter ${maxRetries} försök`);
}

/**
 * Gör screenshot för debugging
 */
export async function takeDebugScreenshot(
  page: Page,
  testName: string,
  step: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `debug-${testName}-${step}-${timestamp}.png`;
  const path = `test-results/${filename}`;
  
  await page.screenshot({ path });
  return path;
}

/**
 * Kontrollera mobile viewport
 */
export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 });
}

/**
 * Kontrollera desktop viewport
 */
export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
}

/**
 * Hämta alla console messages under test
 */
export async function captureConsoleLogs(
  page: Page,
  callback: (type: string, message: string) => void
): Promise<void> {
  page.on('console', (msg) => {
    callback(msg.type(), msg.text());
  });
}
