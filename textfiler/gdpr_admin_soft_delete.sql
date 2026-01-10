-- GDPR / Admin hardening: soft delete + audit log
-- Apply in Supabase SQL editor.

-- 0) Compatibility: Edge Functions use .from("valuations") which targets public.valuations.
-- If your real table lives in another schema (e.g. valuations.valuations), create a public VIEW.
-- NOTE (GDPR / revision safety):
-- - RLS/policies MUST be enforced on the base table (valuations.valuations).
-- - This VIEW is only a compatibility layer for clients/Edge code that defaults to public schema.
do $$
begin
  if to_regclass('public.valuations') is null and to_regclass('valuations.valuations') is not null then
    execute 'create or replace view public.valuations as select * from valuations.valuations';
    execute 'grant select on public.valuations to authenticated';
    execute 'grant select on public.valuations to anon';
    raise notice 'Created public.valuations VIEW pointing to valuations.valuations (plus SELECT grants).';
  end if;
end $$;

-- If public.valuations is a VIEW, make soft-delete/restore updates work via an INSTEAD OF trigger.
-- This is needed because PostgREST (and Edge Functions) operate against public schema by default.
do $$
begin
  if to_regclass('valuations.valuations') is not null
     and exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'valuations'
          and c.relkind = 'v'
     ) then
    execute $ddl$
      create or replace function public.valuations_view_soft_delete()
      returns trigger
      language plpgsql
      as $fn$
      begin
        -- Views with INSTEAD OF triggers can't specify column lists on the trigger,
        -- so we enforce that only deleted_at/deleted_by changes are allowed here.
        if (NEW.deleted_at is distinct from OLD.deleted_at)
           or (NEW.deleted_by is distinct from OLD.deleted_by) then
          update valuations.valuations
            set deleted_at = NEW.deleted_at,
                deleted_by = NEW.deleted_by
          where id = NEW.id;
          return NEW;
        end if;

        raise exception 'Only deleted_at/deleted_by updates are supported on public.valuations';
      end;
      $fn$;
    $ddl$;

    execute 'drop trigger if exists valuations_view_soft_delete on public.valuations';
    execute 'create trigger valuations_view_soft_delete instead of update on public.valuations for each row execute function public.valuations_view_soft_delete()';
    raise notice 'Installed INSTEAD OF UPDATE trigger on public.valuations VIEW for deleted_at/deleted_by.';
  end if;
end $$;

-- 1) Soft delete columns on valuations
do $$
begin
  -- Only attempt to ALTER if public.valuations is a real table (not a view)
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'valuations'
      and c.relkind = 'r'
  ) then
    execute 'alter table public.valuations add column if not exists deleted_at timestamptz null';
    execute 'alter table public.valuations add column if not exists deleted_by uuid null';
  end if;
end $$;

-- Some projects may keep this table in a non-public schema (e.g. valuations.valuations)
alter table if exists valuations.valuations
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

-- 1b) Soft delete columns on customers
alter table if exists public.customers
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

-- 1c) Soft delete columns on contact requests (to avoid hard deletes)
alter table if exists public.contact_requests
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

-- 1cc) Soft delete columns on cases (admin-owned objects)
alter table if exists public.cases
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

-- 1d) Soft delete columns on comments (work content)
alter table if exists public.case_comments
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

alter table if exists public.cancellation_comments
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

-- FK to auth.users for deleted_by
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'valuations'
      and c.relkind = 'r'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'valuations_deleted_by_fkey'
        and conrelid = 'public.valuations'::regclass
    ) then
      alter table public.valuations
        add constraint valuations_deleted_by_fkey
        foreign key (deleted_by)
        references auth.users(id)
        on delete set null;
    end if;
    return;
  end if;

  if to_regclass('valuations.valuations') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'valuations_deleted_by_fkey'
        and conrelid = 'valuations.valuations'::regclass
    ) then
      alter table valuations.valuations
        add constraint valuations_deleted_by_fkey
        foreign key (deleted_by)
        references auth.users(id)
        on delete set null;
    end if;
    return;
  end if;

  raise notice 'Skipping FK valuations_deleted_by_fkey because no valuations table was found (public.valuations or valuations.valuations).';
end $$;

-- 2) Admin audit log (no PII)
-- IMPORTANT: Hard delete is not used in the ordinary application flow.
-- If a hard delete is ever required, it must be performed via a separate, manual process.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('soft_delete','restore','convert')),
  target_table text not null,
  -- target_id is TEXT to support both UUID and numeric/bigint ids (no PII)
  target_id text not null
);

-- If table existed from an older version, migrate constraints safely.
do $$
declare
  action_constraint_name text;
  hard_delete_count bigint;
begin
  if to_regclass('public.admin_audit_log') is null then
    return;
  end if;

  -- Migrate action check constraint (drop hard_delete).
  select c.conname into action_constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'admin_audit_log'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%action%in%'
  limit 1;

  if action_constraint_name is not null then
    execute 'select count(*) from public.admin_audit_log where action = ''hard_delete''' into hard_delete_count;
    if hard_delete_count = 0 then
      execute format('alter table public.admin_audit_log drop constraint %I', action_constraint_name);
      execute 'alter table public.admin_audit_log add constraint admin_audit_log_action_check check (action in (''soft_delete'',''restore'',''convert''))';
      raise notice 'Migrated admin_audit_log action check: removed hard_delete';
    else
      raise notice 'Skipped migrating admin_audit_log action check (found % hard_delete rows).', hard_delete_count;
    end if;
  end if;
end $$;

-- If table existed from an older version (target_id uuid), migrate it.
do $$
begin
  if to_regclass('public.admin_audit_log') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'admin_audit_log'
        and column_name = 'target_id'
        and data_type = 'uuid'
    ) then
      execute 'alter table public.admin_audit_log alter column target_id type text using target_id::text';
      raise notice 'Migrated admin_audit_log.target_id from uuid -> text';
    end if;
  end if;
end $$;

-- 2b) Customers RLS: exclude soft-deleted from client SELECT
-- Goal: ensure deleted_at IS NULL is enforced for client-visible rows.
alter table if exists public.customers enable row level security;

do $$
begin
  -- Customer can read own customer row only if not deleted
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customers' and policyname='customers_select_own_not_deleted'
  ) then
    create policy customers_select_own_not_deleted
      on public.customers
      for select
      to authenticated
      using (auth.uid() = id and deleted_at is null);
  end if;

  -- Admins can read customers (still excluding soft-deleted).
  -- If you want STRICTER separation, remove this policy and fetch customers via Edge Function using service role.
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customers' and policyname='customers_select_admin_not_deleted'
  ) then
    create policy customers_select_admin_not_deleted
      on public.customers
      for select
      to authenticated
      using (
        deleted_at is null
        and exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.role::text = 'admin'
        )
      );
  end if;
end $$;

-- 2c) Helper: admin check expression (inline)
-- We use BOTH user_roles (primary) and profiles.role (fallback), matching Edge Functions.
-- NOTE: keep this in policies, to avoid needing a SQL function migration.

-- Optional: index for lookups
create index if not exists admin_audit_log_target_idx on public.admin_audit_log(target_table, target_id);

-- 3) RLS hardening
do $$
begin
  -- Only enable RLS if public.valuations is a real table (not a view)
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'valuations'
      and c.relkind = 'r'
  ) then
    execute 'alter table public.valuations enable row level security';
  end if;
end $$;

-- 3b) Cases RLS (per clarified model)
-- Principle:
-- - Only admin can create/update/archive cases (done via Edge Function / service role).
-- - Admin can read ALL cases (not soft-deleted).
-- - Customer can read ONLY own cases (not soft-deleted).
alter table if exists public.cases enable row level security;

do $$
begin
  -- Admin can read all non-deleted cases
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='cases' and policyname='cases_select_admin_not_deleted'
  ) then
    create policy cases_select_admin_not_deleted
      on public.cases
      for select
      to authenticated
      using (
        deleted_at is null
        and (
          exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text = 'admin')
        )
      );
  end if;

  -- Customer can read own non-deleted cases
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='cases' and policyname='cases_select_customer_own_not_deleted'
  ) then
    create policy cases_select_customer_own_not_deleted
      on public.cases
      for select
      to authenticated
      using (deleted_at is null and customer_id = auth.uid());
  end if;

  -- No INSERT/UPDATE/DELETE policies for authenticated on cases.
  -- This ensures only service role (Edge Functions) can mutate cases.
end $$;

-- 3c) Case comments RLS (shared chat)
-- Principle:
-- - Admin can read all comments (not soft-deleted).
-- - Customer can read comments for their own cases (not soft-deleted).
-- - Admin can insert comments.
-- - Customer can insert comments only into their own case.
-- - Admin can update/delete comments.
-- - Customer can update/delete only their own comments (recommend: only soft-delete via update).
alter table if exists public.case_comments enable row level security;

do $$
begin
  -- Admin read all non-deleted comments
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_select_admin_not_deleted'
  ) then
    create policy case_comments_select_admin_not_deleted
      on public.case_comments
      for select
      to authenticated
      using (
        deleted_at is null
        and (
          exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text = 'admin')
        )
      );
  end if;

  -- Customer read comments for own cases only
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_select_customer_own_cases'
  ) then
    create policy case_comments_select_customer_own_cases
      on public.case_comments
      for select
      to authenticated
      using (
        deleted_at is null
        and (customer_id is null or customer_id = auth.uid())
        and exists (
          select 1
          from public.cases c
          where c.id = case_comments.case_id
            and c.deleted_at is null
            and c.customer_id = auth.uid()
        )
      );
  end if;

  -- Admin insert
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_insert_admin'
  ) then
    create policy case_comments_insert_admin
      on public.case_comments
      for insert
      to authenticated
      with check (
        (
          exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text = 'admin')
        )
        and author_id = auth.uid()
        and author_type = 'admin'
        and deleted_at is null
      );
  end if;

  -- Customer insert into own case
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_insert_customer_own_case'
  ) then
    create policy case_comments_insert_customer_own_case
      on public.case_comments
      for insert
      to authenticated
      with check (
        author_id = auth.uid()
        and author_type = 'customer'
        and deleted_at is null
        and (customer_id is null or customer_id = auth.uid())
        and exists (
          select 1
          from public.cases c
          where c.id = case_comments.case_id
            and c.deleted_at is null
            and c.customer_id = auth.uid()
        )
      );
  end if;

  -- Admin update/delete
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_update_admin'
  ) then
    create policy case_comments_update_admin
      on public.case_comments
      for update
      to authenticated
      using (
        (
          exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text = 'admin')
        )
      )
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_delete_admin'
  ) then
    create policy case_comments_delete_admin
      on public.case_comments
      for delete
      to authenticated
      using (
        (
          exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role::text = 'admin')
        )
      );
  end if;

  -- Customer update/delete own comments (recommend: client only sets deleted_at/deleted_by)
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_update_customer_own'
  ) then
    create policy case_comments_update_customer_own
      on public.case_comments
      for update
      to authenticated
      using (author_id = auth.uid())
      with check (author_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='case_comments' and policyname='case_comments_delete_customer_own'
  ) then
    create policy case_comments_delete_customer_own
      on public.case_comments
      for delete
      to authenticated
      using (author_id = auth.uid());
  end if;
end $$;
alter table if exists valuations.valuations enable row level security;
alter table if exists public.admin_audit_log enable row level security;

-- Deny all changes from anon by default; allow selects for owners (excluding deleted)
-- Adjust these policies if you already have owner/admin policies.

-- Valuations: owners can select their non-deleted rows
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'valuations'
      and c.relkind = 'r'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='valuations' and policyname='valuations_select_own_not_deleted'
    ) then
      create policy valuations_select_own_not_deleted
        on public.valuations
        for select
        to authenticated
        using (auth.uid() = customer_id and deleted_at is null);
    end if;
  end if;

  if to_regclass('valuations.valuations') is not null then
    if not exists (
      select 1 from pg_policies
      where schemaname='valuations' and tablename='valuations' and policyname='valuations_select_own_not_deleted'
    ) then
      create policy valuations_select_own_not_deleted
        on valuations.valuations
        for select
        to authenticated
        using (auth.uid() = customer_id and deleted_at is null);
    end if;
  end if;

  if to_regclass('public.valuations') is null and to_regclass('valuations.valuations') is null then
    raise notice 'Skipping valuations_select_own_not_deleted policy because no valuations table was found (public.valuations or valuations.valuations).';
  end if;
end $$;

-- Valuations: block updates/deletes from anon (implicit), and from authenticated unless you add explicit policies.
-- Admin actions should happen via Edge Functions using service role.

-- Admin audit log: no client access
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='admin_audit_log' and policyname='admin_audit_log_no_access'
  ) then
    create policy admin_audit_log_no_access
      on public.admin_audit_log
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

-- 4) Verification snippets (manual)
-- 0) Confirm expected tables exist (helpful if you see "relation does not exist")
-- select schemaname, tablename
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;

-- Also show any non-public schemas that might contain your tables
-- select n.nspname as schema_name, c.relname as table_name
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where c.relkind = 'r'
--   and n.nspname not in ('pg_catalog','information_schema')
-- order by n.nspname, c.relname;

-- A) Confirm columns exist
-- select column_name from information_schema.columns where table_schema='public' and table_name in ('valuations','customers','contact_requests','case_comments','cancellation_comments') and column_name in ('deleted_at','deleted_by') order by table_name, column_name;

-- B) Confirm RLS is enabled on valuations + admin_audit_log
-- select schemaname, tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('valuations','admin_audit_log');

-- C) Inspect policies (ensure no client-side UPDATE/DELETE policies are accidentally present)
-- select tablename, policyname, permissive, roles, cmd
-- from pg_policies
-- where schemaname='public' and tablename in ('valuations','admin_audit_log')
-- order by tablename, policyname;

-- D) Verify customers RLS policies exist
-- select tablename, policyname, cmd
-- from pg_policies
-- where schemaname='public' and tablename='customers'
-- order by policyname;

-- 5) Example requests (no PII) - run locally or in a secure environment
-- Replace <JWT> with a real user access token.
-- Replace <VALUATION_ID> with either UUID or numeric id (digits only).
--
-- curl -sS -X POST \
--   -H "Authorization: Bearer <JWT>" \
--   -H "Content-Type: application/json" \
--   "https://<PROJECT_REF>.functions.supabase.co/customer-soft-delete-valuation" \
--   -d '{"valuation_id":"<VALUATION_ID>","confirm":true}'
--
-- curl -sS -X POST \
--   -H "Authorization: Bearer <JWT>" \
--   -H "Content-Type: application/json" \
--   "https://<PROJECT_REF>.functions.supabase.co/admin-soft-delete-valuation" \
--   -d '{"valuation_id":"<VALUATION_ID>","confirm":true}'
--
-- curl -sS -X POST \
--   -H "Authorization: Bearer <JWT>" \
--   -H "Content-Type: application/json" \
--   "https://<PROJECT_REF>.functions.supabase.co/admin-restore-valuation" \
--   -d '{"valuation_id":"<VALUATION_ID>","confirm":true}'
--
-- JS fetch example:
-- await fetch('https://<PROJECT_REF>.functions.supabase.co/admin-save-case', {
--   method: 'POST',
--   headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
--   body: JSON.stringify({ customer_id: '<CUSTOMER_UUID>', title: '...', description: '...', status: 'pending' })
-- })
