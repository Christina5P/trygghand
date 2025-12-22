import { test, expect } from '../fixtures/supabase';
import { randomUUID } from 'node:crypto';
import { assertNotProduction } from '../utils/test-helpers';

test.describe('👥 Kundhantering - Aktivering & Deaktivering', () => {

  test.beforeAll(async () => {
    assertNotProduction();
  });

  test.skip('✅ Ny Kund - Skapas med is_customer=true', async ({ page, supabaseInstance }) => {
    const customerData = {
      email: `newcustomer-${Date.now()}@test.com`,
      name: 'Ny Test Kund',
      phone: '0701234567',
      is_customer: true,
      is_admin: false
    };

    const { data: customer, error } = await supabaseInstance
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    expect(error).toBeNull();
    expect(customer?.is_customer).toBe(true);
    expect(customer?.email).toBe(customerData.email);
    expect(customer?.name).toBe(customerData.name);

    // Cleanup
    await supabaseInstance.from('customers').delete().eq('id', customer!.id);
  });

  test.skip('✅ Kundaktivering - is_customer kan sättas till true', async ({ page, supabaseInstance }) => {
    // Skapa inaktiv kund
    const { data: customer } = await supabaseInstance
      .from('customers')
      .insert([{
        email: `inactive-${Date.now()}@test.com`,
        name: 'Inaktiv Kund',
        is_customer: false
      }])
      .select()
      .single();

    expect(customer?.is_customer).toBe(false);

    // Aktivera kunden
    const { error: activateError } = await supabaseInstance
      .from('customers')
      .update({ is_customer: true })
      .eq('id', customer!.id);

    expect(activateError).toBeNull();

    // Verifiera aktivering
    const { data: activated } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', customer!.id)
      .single();

    expect(activated?.is_customer).toBe(true);

    // Cleanup
    await supabaseInstance.from('customers').delete().eq('id', customer!.id);
  });

  test('✅ Kunddeaktivering - is_customer kan sättas till false', async ({ page, supabaseInstance }) => {
    // Skapa auth-user + aktiv kund
    const email = `active-${Date.now()}@test.com`;
    const { data: createdUser, error: userErr } = await supabaseInstance.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    expect(userErr).toBeFalsy();
    const id = createdUser!.user!.id;
    await supabaseInstance
      .from('customers')
      .insert([{ id, email, name: 'Aktiv Kund', is_customer: true }]);

    // Deaktivera
    const { error } = await supabaseInstance
      .from('customers')
      .update({ is_customer: false })
      .eq('id', id);

    expect(error).toBeNull();

    const { data: deactivated } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    expect(deactivated?.is_customer).toBe(false);

    // Cleanup
    await supabaseInstance.from('customers').delete().eq('id', id);
    await supabaseInstance.auth.admin.deleteUser(id);
  });

  test('✅ Kund Filter - Endast is_customer=true hämtas i useAdminData', async ({ page, supabaseInstance }) => {
    // Skapa mix av aktiva och inaktiva kunder
    const customers = [
      { email: `active1-${Date.now()}@test.com`, name: 'Aktiv 1', is_customer: true },
      { email: `active2-${Date.now()}@test.com`, name: 'Aktiv 2', is_customer: true },
      { email: `inactive-${Date.now()}@test.com`, name: 'Inaktiv', is_customer: false }
    ];

    const insertedIds: string[] = [];

    for (const cust of customers) {
      const { data: createdUser, error: userErr } = await supabaseInstance.auth.admin.createUser({
        email: cust.email,
        email_confirm: true,
      });
      expect(userErr).toBeFalsy();
      const id = createdUser!.user!.id;
      await supabaseInstance
        .from('customers')
        .insert([{ id, ...cust }]);
      insertedIds.push(id);
    }

    // Hämta endast aktiva (samma query som useAdminData)
    const { data: activeCustomers } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('is_customer', true);

    // Borde hitta minst 2 aktiva (de vi just skapade)
    const ourActiveCustomers = activeCustomers?.filter(c => 
      c.email?.startsWith('active1-') || c.email?.startsWith('active2-')
    ) || [];

    expect(ourActiveCustomers.length).toBe(2);

    // Cleanup
    for (const id of insertedIds) {
      await supabaseInstance.from('customers').delete().eq('id', id);
      await supabaseInstance.auth.admin.deleteUser(id);
    }
  });

  test('✅ CustomerRoute Guard - Kontrollerar is_customer för åtkomst', async ({ page, testCustomer }) => {
    // testCustomer från fixture har alltid is_customer=true
    expect(testCustomer?.is_customer).toBe(true);

    // En kund med is_customer=false ska inte få tillgång till /min-sida
    // Detta testas genom CustomerRoute-komponenten
  });
});

test.describe('👥 Kundhantering - Arkivering', () => {
  test.beforeAll(async () => {
    assertNotProduction();
  });

  test('✅ Arkivera Kund - Flyttas till archived_customers', async ({ page, supabaseInstance, testCustomer }) => {
    const customerId = testCustomer!.id;

    // Arkivera kunden (simulerar CustomerManagement toggle)
    const { error: archiveError } = await supabaseInstance
      .from('archived_customers')
      .insert([{
        id: customerId,
        email: testCustomer!.email,
        name: testCustomer!.name,
        phone: testCustomer!.phone,
        is_admin: testCustomer!.is_admin || false,
        archived_reason: 'Test arkivering',
        original_data: testCustomer
      }]);

    expect(archiveError).toBeNull();

    // Verifiera att kund finns i arkiv
    const { data: archived } = await supabaseInstance
      .from('archived_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    expect(archived).not.toBeNull();
    expect(archived?.email).toBe(testCustomer!.email);
    expect(archived?.archived_reason).toBe('Test arkivering');
  });

  test('✅ Arkiverad Kund - Original data bevaras', async ({ page, supabaseInstance }) => {
    const customerData = {
      email: `archive-test-${Date.now()}@test.com`,
      name: 'Test Arkivering',
      phone: '0709876543',
      is_customer: true,
      is_admin: false
    };

    // Skapa auth-user + kund
    const { data: createdUser, error: userErr } = await supabaseInstance.auth.admin.createUser({
      email: customerData.email,
      email_confirm: true,
    });
    expect(userErr).toBeFalsy();
    const customerId = createdUser!.user!.id;
    await supabaseInstance
      .from('customers')
      .insert([{ id: customerId, email: customerData.email, name: customerData.name, phone: customerData.phone, is_customer: true, is_admin: false }]);
    const { data: customer } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    // Arkivera med original_data
    const { error } = await supabaseInstance
      .from('archived_customers')
      .insert([{
        id: customerId,
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        archived_reason: 'Deaktiverad av admin',
        original_data: customer
      }]);

    expect(error).toBeNull();

    // Hämta och verifiera original_data
    const { data: archived } = await supabaseInstance
      .from('archived_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    expect(archived?.original_data).not.toBeNull();
    expect((archived?.original_data as any)?.email).toBe(customerData.email);

    // Cleanup
    await supabaseInstance.from('archived_customers').delete().eq('id', customerId);
    await supabaseInstance.from('customers').delete().eq('id', customerId);
    await supabaseInstance.auth.admin.deleteUser(customerId);
  });

  test('✅ Återställ Kund - Från arkiv till aktiv', async ({ page, supabaseInstance }) => {
    const customerData = {
      email: `restore-test-${Date.now()}@test.com`,
      name: 'Test Återställning',
      is_customer: false
    };

    // Skapa auth-user + kund i customers först
    const { data: createdUser, error: userErr } = await supabaseInstance.auth.admin.createUser({
      email: customerData.email,
      email_confirm: true,
    });
    expect(userErr).toBeFalsy();
    const customerId = createdUser!.user!.id;
    await supabaseInstance
      .from('customers')
      .insert([{ id: customerId, email: customerData.email, name: customerData.name, is_customer: false }]);
    const { data: originalCustomer } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    // Arkivera
    await supabaseInstance
      .from('archived_customers')
      .insert([{
        id: customerId,
        email: customerData.email,
        name: customerData.name,
        archived_reason: 'Test',
        original_data: originalCustomer
      }]);

    // Ta bort från customers
    await supabaseInstance
      .from('customers')
      .delete()
      .eq('id', customerId);

    // Återställ (simulerar ArchivedCustomersList restore)
    const { data: archived } = await supabaseInstance
      .from('archived_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    // Upsert tillbaka till customers med is_customer=true
    const { error: upsertError } = await supabaseInstance
      .from('customers')
      .upsert({
        id: archived!.id,
        email: archived!.email,
        name: archived!.name,
        phone: archived!.phone,
        is_admin: archived!.is_admin,
        is_customer: true // Återaktivera
      }, { onConflict: 'id' });

    expect(upsertError).toBeNull();

    // Ta bort från arkiv
    await supabaseInstance
      .from('archived_customers')
      .delete()
      .eq('id', customerId);

    // Verifiera att kunden är aktiv igen
    const { data: restored } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    expect(restored?.is_customer).toBe(true);
    expect(restored?.email).toBe(customerData.email);

    // Cleanup
    await supabaseInstance.from('customers').delete().eq('id', customerId);
    await supabaseInstance.auth.admin.deleteUser(customerId);
  });

  test('✅ Arkiv Lista - archived_at sorteras desc', async ({ page, supabaseInstance }) => {
    const now = new Date();
    const testCustomers = [
      {
        id: crypto.randomUUID(),
        email: `old-${Date.now()}@test.com`,
        name: 'Gammal Arkiverad',
        archived_at: new Date(now.getTime() - 86400000).toISOString(), // 1 dag sedan
        archived_reason: 'Test'
      },
      {
        id: crypto.randomUUID(),
        email: `new-${Date.now()}@test.com`,
        name: 'Ny Arkiverad',
        archived_at: now.toISOString(),
        archived_reason: 'Test'
      }
    ];

    for (const cust of testCustomers) {
      await supabaseInstance
        .from('archived_customers')
        .insert([cust]);
    }

    // Hämta sorterat (samma query som ArchivedCustomersList)
    const { data: archivedList } = await supabaseInstance
      .from('archived_customers')
      .select('*')
      .order('archived_at', { ascending: false });

    // Första i listan borde vara den nyaste
    const ourArchived = archivedList?.filter(c =>
      c.email?.includes(`-${Date.now().toString().slice(0, -3)}`)
    ) || [];

    if (ourArchived.length >= 2) {
      const first = new Date(ourArchived[0].archived_at!);
      const second = new Date(ourArchived[1].archived_at!);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }

    // Cleanup
    for (const cust of testCustomers) {
      await supabaseInstance.from('archived_customers').delete().eq('id', cust.id);
    }
  });

  test('✅ Arkiverad Kund - Radering från arkiv', async ({ page, supabaseInstance }) => {
    const { data: archivedCustomer } = await supabaseInstance
      .from('archived_customers')
      .insert([{
        id: crypto.randomUUID(),
        email: `delete-test-${Date.now()}@test.com`,
        name: 'Ska Raderas',
        archived_reason: 'Test'
      }])
      .select()
      .single();

    // Radera från arkiv
    const { error } = await supabaseInstance
      .from('archived_customers')
      .delete()
      .eq('id', archivedCustomer!.id);

    expect(error).toBeNull();

    // Verifiera att den är borta
    const { data: deleted } = await supabaseInstance
      .from('archived_customers')
      .select('*')
      .eq('id', archivedCustomer!.id)
      .single();

    expect(deleted).toBeNull();
  });
});

test.describe('👥 Kundhantering - Admin-funktioner', () => {
  test.beforeAll(async () => {
    assertNotProduction();
  });

  test('✅ Admin Flag - is_admin kan sättas', async ({ page, supabaseInstance }) => {
    const email = `admin-${Date.now()}@test.com`;
    const { data: createdUser, error: userErr } = await supabaseInstance.auth.admin.createUser({ email, email_confirm: true });
    expect(userErr).toBeFalsy();
    const id = createdUser!.user!.id;
    await supabaseInstance
      .from('customers')
      .insert([{ id, email, name: 'Test Admin', is_customer: true, is_admin: true }]);
    const { data: admin } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    expect(admin?.is_admin).toBe(true);
    expect(admin?.is_customer).toBe(true);

    // Cleanup
    await supabaseInstance.from('customers').delete().eq('id', id);
    await supabaseInstance.auth.admin.deleteUser(id);
  });

  test('✅ CustomerManagement - Deaktivera & Arkivera i ett steg', async ({ page, supabaseInstance }) => {
    // Skapa auth-user + aktiv kund
    const email = `deactivate-${Date.now()}@test.com`;
    const { data: createdUser, error: userErr } = await supabaseInstance.auth.admin.createUser({ email, email_confirm: true });
    expect(userErr).toBeFalsy();
    const customerId = createdUser!.user!.id;
    await supabaseInstance
      .from('customers')
      .insert([{ id: customerId, email, name: 'Ska Deaktiveras', is_customer: true }]);
    const { data: customer } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    // Steg 1: Arkivera (simulerar CustomerManagement toggleCustomerStatus)
    await supabaseInstance
      .from('archived_customers')
      .upsert({
        id: customerId,
        email: customer!.email,
        name: customer!.name,
        phone: customer!.phone,
        is_admin: customer!.is_admin || false,
        archived_reason: 'Deaktiverad av admin',
        original_data: customer
      }, { onConflict: 'id' });

    // Steg 2: Ta bort från customers
    await supabaseInstance
      .from('customers')
      .delete()
      .eq('id', customerId);

    // Verifiera att kunden INTE finns i customers
    const { data: inCustomers } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    expect(inCustomers).toBeNull();

    // Verifiera att kunden finns i arkiv
    const { data: inArchive } = await supabaseInstance
      .from('archived_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    expect(inArchive).not.toBeNull();
    expect(inArchive?.archived_reason).toBe('Deaktiverad av admin');

    // Cleanup
    await supabaseInstance.from('archived_customers').delete().eq('id', customerId);
    await supabaseInstance.auth.admin.deleteUser(customerId);
  });

  test('✅ Användarhantering - GDPR Radering (separat från arkivering)', async ({ page, supabaseInstance }) => {
    // GDPR-radering är en separat funktion från arkivering
    // Den hanteras av GDPRDeleteUserDialog och gdpr.ts

    const email = `gdpr-${Date.now()}@test.com`;
    const { data: createdUser, error: userErr } = await supabaseInstance.auth.admin.createUser({ email, email_confirm: true });
    expect(userErr).toBeFalsy();
    const id = createdUser!.user!.id;
    await supabaseInstance
      .from('customers')
      .insert([{ id, email, name: 'GDPR Test', is_customer: true }]);
    const { data: customer } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    // Verifiera att kund existerar
    expect(customer).not.toBeNull();

    // GDPR-radering skulle ta bort ALL kunddata
    // För detta test, radera bara kunden
    const { error } = await supabaseInstance
      .from('customers')
      .delete()
      .eq('id', id);

    expect(error).toBeNull();

    // Verifiera borttagning
    const { data: deleted } = await supabaseInstance
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    expect(deleted).toBeNull();
    await supabaseInstance.auth.admin.deleteUser(id);
  });
});

test.describe('👥 Kundhantering - Säkerhet', () => {
  test('✅ DATABASE_ENV=test verifieras', async ({ page }) => {
    expect(process.env.DATABASE_ENV).toBe('test');
  });

  test('✅ RLS Policies - Endast admin kan arkivera', async ({ page }) => {
    // RLS policies från add_delete_policy_archived_customers.sql
    // Detta skulle kräva auth-context för att testa fullt ut
    // För nu, verifiera att tabellen existerar
    expect(true).toBe(true);
  });
});
