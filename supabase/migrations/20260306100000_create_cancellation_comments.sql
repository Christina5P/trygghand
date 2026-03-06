begin;

alter table public.cancellation_comments
  alter column is_internal set default false,
  alter column created_at set default now();

update public.cancellation_comments
set is_internal = false
where is_internal is null;

update public.cancellation_comments
set created_at = now()
where created_at is null;

alter table public.cancellation_comments
  alter column id set not null,
  alter column cancellation_id set not null,
  alter column user_id set not null,
  alter column message set not null,
  alter column is_internal set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cancellation_comments_message_length_check'
      and conrelid = 'public.cancellation_comments'::regclass
  ) then
    alter table public.cancellation_comments
      add constraint cancellation_comments_message_length_check
      check (char_length(message) between 1 and 2000);
  end if;
end $$;

create index if not exists idx_cancellation_comments_cancellation_created
  on public.cancellation_comments (cancellation_id, created_at desc);

create index if not exists idx_cancellation_comments_visible
  on public.cancellation_comments (cancellation_id)
  where deleted_at is null;

create index if not exists idx_cancellation_comments_user_id
  on public.cancellation_comments (user_id);

alter table public.cancellation_comments enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cancellation_comments'
  loop
    execute format(
      'drop policy if exists %I on public.cancellation_comments',
      pol.policyname
    );
  end loop;
end $$;

create policy "cancellation_comments_admin_select"
  on public.cancellation_comments
  for select
  to authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

create policy "cancellation_comments_customer_select"
  on public.cancellation_comments
  for select
  to authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.subscription_cancellations sc
      where sc.id = cancellation_comments.cancellation_id
        and sc.customer_id = auth.uid()
    )
  );

revoke all on table public.cancellation_comments from anon;
revoke all on table public.cancellation_comments from authenticated;

grant select on table public.cancellation_comments to authenticated;
grant all on table public.cancellation_comments to service_role;

comment on table public.cancellation_comments is
  'Comments/messages on subscription cancellations. Authenticated users may only read allowed rows via RLS. Writes are intended to go via Edge Functions using service_role.';

comment on column public.cancellation_comments.user_id is
  'Auth user id of the comment author.';

comment on column public.cancellation_comments.is_internal is
  'Reserved for internal/customer-facing classification. Current customer read policy allows all non-deleted comments on own cancellation.';

comment on column public.cancellation_comments.deleted_at is
  'Soft delete timestamp. Rows with non-null deleted_at are hidden from normal reads.';

comment on column public.cancellation_comments.deleted_by is
  'Auth user id that soft-deleted the comment.';

commit;