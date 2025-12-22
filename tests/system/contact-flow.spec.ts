/**
 * Contact Flow Tests
 * Testar kontaktformulär-funktionalitet från start till slut
 */

import { test, expect, SupabaseTestService, TestDataGenerator, supabase } from '../fixtures/supabase';
import { createClient } from '@supabase/supabase-js';
import {
  generateTestEmail,
  generateTestPhone,
  fillForm,
  acceptCookiesIfPresent,
  verifyPageLoaded,
  waitForElementAndCheck,
  scrollToElement,
  assertNotProduction,
  takeDebugScreenshot,
} from '../utils/test-helpers';

// Supabase client
const supabaseService = new SupabaseTestService(supabase);

test.describe('📧 Contact Form - Kontaktformulär', () => {
  test.beforeEach(async ({ page }) => {
    // Säkerhet: Kontrollera att vi inte kör mot produktion
    assertNotProduction(page.url());
    await supabaseService.verifyTestEnvironment();
  });

  test('✅ Ska kunna navigera till kontakt-sektion från startsidan', async ({ page }) => {
    await page.goto('/');
    await verifyPageLoaded(page, 'TryggHand');
    
    // Acceptera cookies om de syns
    await acceptCookiesIfPresent(page);

    // Hitta och klicka på "Boka kostnadsfri konsultation" knapp
    const consultationButton = page.locator('text=Boka kostnadsfri konsultation').first();
    await expect(consultationButton).toBeVisible();
    await consultationButton.click();

    // Verifiera att vi scrollade till kontakt-sektion
    const contactForm = page.locator('#kontakt-form');
    await expect(contactForm).toBeInViewport();
  });

  test('✅ Kontaktformulär - Fylla i och skicka data', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPhone = generateTestPhone();
    const testData = {
      firstname: 'Test',
      lastname: 'Användare',
      email: testEmail,
      phone: testPhone,
      message: 'Det här är ett automatiserat test av kontaktformulären',
    };

    // 1️⃣ Navigera till startsidan
    await page.goto('/');
    await verifyPageLoaded(page, 'TryggHand');
    await acceptCookiesIfPresent(page);

    // Capture console logs
    page.on('console', msg => console.log('🔵 BROWSER LOG:', msg.type().toUpperCase(), msg.text()));
    page.on('response', res => {
      if (res.url().includes('contact_requests') || res.status() >= 400) {
        console.log(`📡 Response: ${res.url()} - ${res.status()}`);
      }
    });

    // 2️⃣ Scrolla till kontakt-formuläret
    const contactForm = page.locator('#kontakt-form');
    await scrollToElement(page, '#kontakt-form');

    // 3️⃣ Fylla i formuläret
    await fillForm(page, testData);

    // 4️⃣ Skicka formuläret
    const submitButton = page.locator('button:has-text("Skicka förfrågan")').first();
    await expect(submitButton).toBeVisible();
    
    // Vänta på network-request och response
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('contact_requests') || response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null),
      submitButton.click()
    ]);

    // Wait a bit for React state to update
    await page.waitForTimeout(500);

    // 5️⃣ Verifiera success-meddelande (försök flera varianter)
    let successMessage = page.locator('text=Tack för din förfrågan');
    let visible = await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!visible) {
      successMessage = page.locator('text=Tack');
      visible = await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
    }
    
    if (!visible) {
      // Debug: visa vad som faktiskt finns på sidan
      const allText = await page.locator('body').textContent();
      console.log('Sidtext efter submit:', allText?.substring(0, 500));
      
      // Check if error message appears
      const errorText = await page.locator('[class*="red"]').textContent().catch(() => '');
      console.log('Eventuellt felmeddelande:', errorText);
      
      throw new Error('Success-meddelande hittas inte. Försök med andra texter.');
    }
    
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // 6️⃣ Verifiera i Supabase att data sparades
    await page.waitForTimeout(1000); // Vänta på async insert
    const exists = await supabaseService.verifyContactRequestExists(testEmail);
    expect(exists).toBe(true);

    // 7️⃣ Verifiera data-innehål
    const { data, error } = await supabaseService.getContactRequest(testEmail);
    expect(error).toBeNull();
    const record = data as any;
    expect(record?.firstname).toBe('Test');
    expect(record?.lastname).toBe('Användare');
    expect(record?.message).toContain('automatiserat test');

    // 8️⃣ Rensa test-data från databasen
    await supabaseService.cleanupContactRequest(testEmail);
    console.log(`✅ Test avslutad och data rensad för: ${testEmail}`);
  });

  test('✅ Validering - Kontakt-formulär kräver obligatoriska fält', async ({ page }) => {
    await page.goto('/');
    await verifyPageLoaded(page, 'TryggHand');
    await acceptCookiesIfPresent(page);

    await scrollToElement(page, '#kontakt-form');

    // Försök skicka tom form
    const submitButton = page.locator('button:has-text("Skicka förfrågan")').first();
    await submitButton.click();

    // Kolla att form inte skickas (HTML5 validation)
    const form = page.locator('form').first();
    const isValid = await form.evaluate((el: HTMLFormElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('✅ Responsive design - Kontaktformulär på mobil', async ({ page }) => {
    // Sätt mobil viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await verifyPageLoaded(page, 'TryggHand');
    await acceptCookiesIfPresent(page);

    const contactForm = page.locator('#kontakt-form');
    await expect(contactForm).toBeVisible();

    // Fylla formulär på mobil
    const testData = TestDataGenerator.createContactFormData();
    await fillForm(page, testData);

    // Formulär bör vara scrollbart och clickable på mobil
    const submitButton = page.locator('button:has-text("Skicka förfrågan")').first();
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeVisible();

    await submitButton.click();
    await expect(page.locator('text=Tack')).toBeVisible({ timeout: 5000 });

    // Rensa data
    await supabaseService.cleanupContactRequest(testData.email);
  });

  test('✅ E-post validering - Ogiltigt format avvisas', async ({ page }) => {
    await page.goto('/');
    await verifyPageLoaded(page, 'TryggHand');

    await scrollToElement(page, '#kontakt-form');

    const emailInput = page.locator('input[name="email"]').first();
    await emailInput.fill('detta-ar-inte-en-epost');

    const submitButton = page.locator('button:has-text("Skicka förfrågan")').first();
    await submitButton.click();

    // HTML5 email validation bör förhindra submit
    const form = page.locator('form').first();
    const isValid = await form.evaluate((el: HTMLFormElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('✅ Privacypolicy-länk - Fungerar från kontaktformulär', async ({ page }) => {
    await page.goto('/');
    await acceptCookiesIfPresent(page);

    await scrollToElement(page, '#kontakt-form');

    // Hitta privacy-länken
    const privacyLink = page.locator('a[href="/privacy"]').first();
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toContainText('integritetspolicy');

    // Klicka på länk
    await privacyLink.click();
    await page.waitForLoadState('networkidle');

    // Verifiera att vi är på privacy-sidan
    const privacyTitle = page.locator('h1, h2').filter({ hasText: /privacy|integritets|personuppgifter/i });
    await expect(privacyTitle).toBeVisible();
  });

  test('✅ Formulär reset - Formuläret töms efter lyckad submit', async ({ page }) => {
    await page.goto('/');
    await verifyPageLoaded(page, 'TryggHand');
    await acceptCookiesIfPresent(page);

    await scrollToElement(page, '#kontakt-form');

    const testData = TestDataGenerator.createContactFormData();
    await fillForm(page, testData);

    // Skicka
    const submitButton = page.locator('button:has-text("Skicka förfrågan")').first();
    await submitButton.click();

    // Vänta på success-meddelande
    await expect(page.locator('text=Tack')).toBeVisible({ timeout: 5000 });

    // Verifiera att form är tom efter reset
    const firstNameInput = page.locator('input[name="firstname"]').first();
    const value = await firstNameInput.inputValue();
    expect(value).toBe('');

    // Rensa test-data
    await supabaseService.cleanupContactRequest(testData.email);
  });

  test.skip('⚠️ Database - Kontrollera att vi använder TEST-miljö', async () => {
    // Denna test säkerställer att vi ALDRIG kör mot produktion
    const dbEnv = process.env.DATABASE_ENV;
    expect(dbEnv).toBe('test');

    // Verifiera Supabase URL är test-instans
    const url = process.env.SUPABASE_URL || '';
    expect(url).toContain('fujeyujbchgrtaxodvcz'); // Test Supabase project ID
  });
});
