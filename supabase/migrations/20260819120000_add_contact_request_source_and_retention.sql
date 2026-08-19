-- Contact requests are retained for up to 24 months after creation once closed
-- or converted. Active requests remain available until they are resolved.
alter table public.contact_requests
  add column if not exists source text,
  add column if not exists consent_at timestamptz,
  add column if not exists privacy_notice_version text,
  add column if not exists retention_until timestamptz;

-- Existing Handplockat requests have a stable legacy marker in message.
update public.contact_requests
set source = case
  when message like '%[Köpintresse Handplockat]%' then 'handplockat'
  else 'trygghand'
end
where source is null;

update public.contact_requests
set retention_until = coalesce(created_at, now()) + interval '24 months'
where retention_until is null;

alter table public.contact_requests
  alter column source set default 'unknown',
  alter column source set not null,
  alter column retention_until set default (now() + interval '24 months');

alter table public.contact_requests
  drop constraint if exists contact_requests_source_check;

alter table public.contact_requests
  add constraint contact_requests_source_check
  check (source in ('trygghand', 'handplockat', 'unknown'));

create index if not exists contact_requests_source_created_at_idx
  on public.contact_requests (source, created_at desc);

create index if not exists contact_requests_retention_idx
  on public.contact_requests (retention_until)
  where status in ('closed', 'converted');

-- Purging is deliberately limited to resolved requests. Run this function from
-- a protected scheduled job with the service role after the retention period.
create or replace function public.purge_expired_contact_requests(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.contact_requests
  where id in (
    select id
    from public.contact_requests
    where status in ('closed', 'converted')
      and retention_until is not null
      and retention_until <= now()
    order by retention_until
    limit least(greatest(coalesce(p_limit, 500), 1), 5000)
  );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_contact_requests(integer) from public;