begin;

alter table public.valuations
  alter column shared_with_admin set default true;

grant update on table public.valuations to authenticated;

grant select on table public.valuations to authenticated;

commit;
