begin;

-- =========================
-- TABLES
-- =========================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create table if not exists public.push_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  case_updates_enabled boolean not null default false,
  new_messages_enabled boolean not null default false,
  booked_times_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default time '22:00',
  quiet_hours_end time not null default time '07:00',
  timezone text not null default 'Europe/Stockholm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_delivery_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_sent_at timestamptz null,
  pending_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

create index if not exists push_subscriptions_updated_at_idx
  on public.push_subscriptions(updated_at desc);

-- =========================
-- UPDATED_AT TRIGGER FUNCTION
-- =========================

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_row_updated_at();

create trigger push_notification_preferences_set_updated_at
before update on public.push_notification_preferences
for each row execute function public.set_row_updated_at();

create trigger push_delivery_state_set_updated_at
before update on public.push_delivery_state
for each row execute function public.set_row_updated_at();

-- =========================
-- ENABLE RLS
-- =========================

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_preferences enable row level security;
alter table public.push_delivery_state enable row level security;

-- =========================
-- POLICIES
-- =========================

-- push_subscriptions

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
on public.push_subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
  or public.is_admin_user(auth.uid())
);

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own
on public.push_subscriptions
for insert
to authenticated
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
);

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own
on public.push_subscriptions
for update
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
)
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
);

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own
on public.push_subscriptions
for delete
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
);

-- push_notification_preferences

drop policy if exists push_preferences_select_own on public.push_notification_preferences;
create policy push_preferences_select_own
on public.push_notification_preferences
for select
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
  or public.is_admin_user(auth.uid())
);

drop policy if exists push_preferences_insert_own on public.push_notification_preferences;
create policy push_preferences_insert_own
on public.push_notification_preferences
for insert
to authenticated
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
);

drop policy if exists push_preferences_update_own on public.push_notification_preferences;
create policy push_preferences_update_own
on public.push_notification_preferences
for update
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
)
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
);

drop policy if exists push_preferences_delete_own on public.push_notification_preferences;
create policy push_preferences_delete_own
on public.push_notification_preferences
for delete
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt()->>'role', '') = 'service_role'
);

-- push_delivery_state (service only)

drop policy if exists push_delivery_state_service_only on public.push_delivery_state;
create policy push_delivery_state_service_only
on public.push_delivery_state
for all
to authenticated
using (coalesce(auth.jwt()->>'role', '') = 'service_role')
with check (coalesce(auth.jwt()->>'role', '') = 'service_role');

-- =========================
-- GRANTS
-- =========================

grant select, insert, update, delete
on public.push_subscriptions
to authenticated;

grant select, insert, update, delete
on public.push_notification_preferences
to authenticated;

grant select, insert, update, delete
on public.push_delivery_state
to authenticated;

-- =========================
-- CLEANUP FUNCTION
-- =========================

create or replace function public.purge_inactive_push_subscriptions(
  max_age interval default interval '18 months'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.push_subscriptions
  where updated_at < now() - max_age;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.purge_inactive_push_subscriptions(interval)
  is 'Tar bort inaktiva push-subscriptions äldre än max_age. Kör via cron månadsvis.';

commit;