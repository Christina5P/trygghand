create or replace function public.set_customer_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.user_id is null and auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists customers_set_user_id on public.customers;
create trigger customers_set_user_id
before insert on public.customers
for each row
execute function public.set_customer_user_id();

update public.customers c
set user_id = u.id
from auth.users u
where c.user_id is null
  and c.email is not null
  and lower(c.email) = lower(u.email);
