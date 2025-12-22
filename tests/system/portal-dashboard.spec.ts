/**
 * Supabase Test Fixtures & Database Setup
 * Hanterar test-data, mock och säker test-miljö
 */

import { test as base, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---- Editor fallback (för TS / VS Code) ----
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
}
if (!process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = 'public-anon-key';
}

// ---- Lazy import av supabase-js ----
let supabaseLib: typeof import('@supabase/supabase-js') | null = null;

const getSupabaseLib = async () => {
  if (!supabaseLib) {
    supabaseLib = await import('@supabase/supabase-js');
  }
  return supabaseLib;
};

// ---- Mock client (ingen nätverkstrafik) ----
const createMockClient = (): SupabaseClient<any> =>
  ({
    from: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }),
      insert: () => ({
        select: () => ({
          maybeSingle: async () => ({ data: { id: 'mock-id' }, error: null }),
        }),
      }),
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  } as unknown as SupabaseClient<any>);

// ---- Singleton Supabase client ----
let supabase: SupabaseClient<any> | null = null;

const getSupabase = async (): Promise<SupabaseClient<any>> => {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (url && key) {
    const { createClient } = await getSupabaseLib();
    supabase = createClient(url, key);
  } else {
    supabase = createMockClient();
  }

  return supabase;
};

// ---- Playwright fixtures ----
type TestFixtures = {
  supabaseInstance: SupabaseClient<any>;
};

export const test = base.extend<TestFixtures>({
  supabaseInstance: async ({}, use) => {
    const client = await getSupabase();
    await use(client);
  },
});

export { expect };

// ---- Supabase Test Service ----
export class SupabaseTestService {
  constructor(private client: SupabaseClient<any>) {}

  async verifyTestEnvironment(): Promise<void> {
    const dbEnv = process.env.DATABASE_ENV;

    if (dbEnv !== 'test') {
      throw new Error(
        `❌ SÄKERHETSFEL: DATABASE_ENV=${dbEnv}. Måste vara 'test'.`
      );
    }

    console.log('✅ Bekräftat: Test-databas används');
  }

  async cleanupContactRequest(email: string): Promise<void> {
    await this.client
      .from('contact_requests')
      .delete()
      .eq('email', email);
  }
}
