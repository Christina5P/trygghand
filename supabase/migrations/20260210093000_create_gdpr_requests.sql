create table if not exists public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  requested_by uuid not null,
  status text not null default 'requested',
  export_bucket text null,
  export_path text null,
  expires_at timestamptz null,
  created_at timestamptz default now(),
  processed_at timestamptz null,
  delivered_at timestamptz null,
  notes text null
);

create index if not exists gdpr_requests_customer_created_at_idx
  on public.gdpr_requests (customer_id, created_at desc);

alter table public.gdpr_requests enable row level security;

create policy "gdpr_requests_select"
  on public.gdpr_requests
  for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = gdpr_requests.customer_id
        and c.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

create policy "gdpr_requests_insert"
  on public.gdpr_requests
  for insert
  with check (
    (
      exists (
        select 1 from public.customers c
        where c.id = gdpr_requests.customer_id
          and c.user_id = auth.uid()
      )
      and gdpr_requests.requested_by = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

create policy "gdpr_requests_update_admin"
  on public.gdpr_requests
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

create policy "gdpr_requests_delete_admin"
  on public.gdpr_requests
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );
