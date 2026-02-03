-- Notifications table for in-portal alerts.
-- Personal data; stored for service delivery (contract).

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  ref_id text not null,
  ref_type text not null,
  actor_id uuid not null,
  payload jsonb null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_read_at_idx on public.notifications (read_at);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

-- Users can read their own notifications.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can mark their own notifications as read.
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Prevent hard deletes from clients.
drop policy if exists notifications_no_delete on public.notifications;
create policy notifications_no_delete on public.notifications
  for delete
  to authenticated
  using (false);

commit;
