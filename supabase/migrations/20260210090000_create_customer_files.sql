create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  bucket text not null,
  path text not null,
  file_type text,
  size bigint,
  created_at timestamptz default now()
);

create index if not exists customer_files_customer_id_idx on public.customer_files (customer_id);

alter table public.customer_files enable row level security;

create policy "customer_files_select_own"
  on public.customer_files
  for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = customer_files.customer_id
        and c.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

create policy "customer_files_insert_own"
  on public.customer_files
  for insert
  with check (
    exists (
      select 1 from public.customers c
      where c.id = customer_files.customer_id
        and c.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );
