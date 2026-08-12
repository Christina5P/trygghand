begin;

create table if not exists public.cube_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  total_volume_m3 numeric(10, 3) not null check (total_volume_m3 >= 0),
  total_weight_kg numeric(10, 2) not null check (total_weight_kg >= 0),
  total_items integer not null check (total_items > 0),
  truck_name text not null,
  truck_capacity_m3 numeric(10, 3) not null check (truck_capacity_m3 > 0),
  created_at timestamptz not null default now()
);

create index if not exists cube_plans_customer_created_at_idx
  on public.cube_plans (customer_id, created_at desc);

alter table public.cube_plans enable row level security;

drop policy if exists cube_plans_customer_select_own on public.cube_plans;
create policy cube_plans_customer_select_own
  on public.cube_plans
  for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists cube_plans_customer_insert_own on public.cube_plans;
create policy cube_plans_customer_insert_own
  on public.cube_plans
  for insert
  to authenticated
  with check (customer_id = auth.uid());

drop policy if exists cube_plans_admin_select_all on public.cube_plans;
create policy cube_plans_admin_select_all
  on public.cube_plans
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

create or replace function public.notify_admins_of_cube_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, type, ref_id, ref_type, actor_id, payload)
  select
    admin_user.id,
    'cube_plan',
    new.id::text,
    'cube_plan',
    new.customer_id,
    jsonb_build_object(
      'total_volume_m3', new.total_volume_m3,
      'total_items', new.total_items,
      'truck_name', new.truck_name
    )
  from (
    select p.id
    from public.profiles p
    where p.is_admin = true or p.role = 'admin'
    union
    select ur.user_id as id
    from public.user_roles ur
    where ur.role = 'admin'
  ) as admin_user
  where admin_user.id <> new.customer_id;

  return new;
end;
$$;

drop trigger if exists cube_plans_notify_admins on public.cube_plans;
create trigger cube_plans_notify_admins
  after insert on public.cube_plans
  for each row
  execute function public.notify_admins_of_cube_plan();

commit;