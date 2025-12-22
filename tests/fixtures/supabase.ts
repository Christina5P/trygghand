import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { test as base, expect, PlaywrightTestArgs, PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions } from '@playwright/test';

/**
 * Supabase Test Fixtures & Database Setup
 * Hanterar test-data och cleanup
 */

const createMockClient = (): SupabaseClient<any> => {
  const mock = {
    from: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }),
      insert: () => ({
        select: () => ({ maybeSingle: async () => ({ data: { id: 'mock-id' }, error: null }) }),
        single: async () => ({ data: { id: 'mock-id' }, error: null }),
      }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
      upsert: () => ({ onConflict: (_: string) => ({ data: null, error: null }), eq: async () => ({ data: null, error: null }) }),
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      order: () => ({ data: [], error: null }),
      eq: () => ({ data: null, error: null }),
    }),
  } as unknown as SupabaseClient<any>;
  return mock;
};

const isValidHttpUrl = (v?: string) => !!v && /^https?:\/\//i.test(v);

const getSupabase = (): SupabaseClient<any> => {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  const keyToUse = serviceKey || anonKey;

  if (isValidHttpUrl(url) && !!keyToUse) {
    if (serviceKey) {
      console.log('✅ Using Supabase service role key for tests');
    } else {
      console.log('ℹ️ Using Supabase anon key for tests');
    }
    return createClient<any>(url as string, keyToUse as string);
  } else {
    console.log('⚠️  Using mock Supabase client (missing or invalid SUPABASE_URL/KEY)');
    return createMockClient();
  }
};

// Single source of truth for Supabase client
export const supabase = getSupabase();

/**
 * Custom fixture för Supabase-operationer
 */
type TestFixtures = {
  supabaseInstance: SupabaseClient<any>;
  testCustomerId: string;
  testCustomer: any;
};

export const test = base.extend<TestFixtures>({
  supabaseInstance: async ({}, use: (r: SupabaseClient<any>) => Promise<void>) => {
    console.log('🔧 Initialiserar Supabase test-client');
    const client = getSupabase();
    await use(client);
  },

  testCustomerId: async ({}, use: (r: string) => Promise<void>) => {
    const email = `fixture-${Date.now()}@test.com`;
    const client = getSupabase();

    // Skapa auth-user först (krävs av FK customers.id -> auth.users)
    const { data: createdUser, error: userErr } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (userErr || !createdUser?.user?.id) {
      throw new Error(`Failed to create auth user: ${userErr?.message}`);
    }

    const id = createdUser.user.id;

    // Skapa kund kopplad till auth-user
    const { data, error } = await client
      .from('customers')
      .insert([{
        id,
        email,
        name: 'Fixture Kund',
        is_customer: true,
        is_admin: false,
      }])
      .select()
      .maybeSingle();

    if (error || !data?.id) {
      throw new Error(`Failed to create test customer: ${error?.message}`);
    }

    await use(data.id);

    // Cleanup
    await client.from('customers').delete().eq('id', data.id);
    // Radera auth-user efteråt
    if (createdUser?.user?.id) {
      await client.auth.admin.deleteUser(createdUser.user.id);
    }
  },

  testCustomer: async ({ testCustomerId }: { testCustomerId: string }, use: (r: any) => Promise<void>) => {
    const client = getSupabase();
    const { data } = await client
      .from('customers')
      .select('*')
      .eq('id', testCustomerId)
      .maybeSingle();

    await use(data);
  },
});

// Export alias för kompatibilitet i specs
export const supabaseFixture = test;
export { expect };

/**
 * Tjänst-klass för Supabase test-operationer
 */
export class SupabaseTestService {
  private client: SupabaseClient<any>;

  constructor(client?: SupabaseClient<any>) {
    this.client = client ?? createMockClient();
  }

  /**
   * Kontrollera att contact_request sparades
   */
  async verifyContactRequestExists(email: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('contact_requests')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ Fel vid hämtning av contact_request:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Hämta contact_request
   */
  async getContactRequest(email: string) {
    return this.client
      .from('contact_requests')
      .select('*')
      .eq('email', email)
      .single();
  }

  /**
   * Radera test-data
   */
  async cleanupContactRequest(email: string): Promise<void> {
    await this.client
      .from('contact_requests')
      .delete()
      .eq('email', email);
  }

  /**
   * Kontrollera database-hälsa
   */
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('contact_requests')
        .select('count(*)', { count: 'exact' });

      return !error;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  /**
   * Säkerhet: Verifiera att vi inte använder produktion-databas
   */
  async verifyTestEnvironment(): Promise<void> {
    const dbEnv = process.env.DATABASE_ENV;
    
    if (dbEnv !== 'test') {
      throw new Error(
        `❌ SÄKERHETSFEL: Försök att köra mot icke-test-miljö! ` +
        `DATABASE_ENV=${dbEnv}. Måste vara 'test'.`
      );
    }

    console.log('✅ Bekräftat: Använder test-databas');
  }
}

/**
 * Tjänst för test-datgenerering
 */
export class TestDataGenerator {
  /**
   * Skapa test-kontaktdata
   */
  static createContactFormData(overrides?: Partial<Record<string, string>>) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      firstname: `Test${timestamp}`,
      lastname: `User${random}`,
      email: `test_${timestamp}_${random}@test.se`,
      phone: `070-${Math.floor(Math.random() * 9999999)}`,
      message: `Automated test message - ${new Date().toISOString()}`,
      ...overrides,
    };
  }

  /**
   * Skapa multiple kontakt-records för batch-testing
   */
  static createMultipleContactData(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      ...this.createContactFormData({
        firstname: `TestBatch${i}`,
      }),
    }));
  }
}
