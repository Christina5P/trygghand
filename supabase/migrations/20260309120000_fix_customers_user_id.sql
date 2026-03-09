-- Fix customers.user_id so it always holds the customer's own auth.users.id.
--
-- Background:
--   The customers_set_user_id trigger fires on INSERT and sets user_id = auth.uid().
--   When an admin edge-function (service-role) creates a customer, auth.uid() is NULL,
--   so user_id stays NULL.
--   When an admin creates a customer from the browser (anon/auth client), auth.uid()
--   returns the ADMIN's UUID — incorrectly stamping the customer record with the admin's id.
--
--   Result: customers.user_id is either NULL or the admin's UUID, never the customer's UUID.
--   All notification inserts that use customers.user_id therefore write the wrong user_id,
--   making the notifications invisible to the customer (RLS: user_id = auth.uid()).
--
-- Fix: overwrite customers.user_id with the matching auth.users.id for every customer
-- whose email address exists in auth.users, regardless of current user_id value.

begin;

update public.customers c
set user_id = u.id
from auth.users u
where c.email is not null
  and lower(c.email) = lower(u.email)
  and (c.user_id is null or c.user_id != u.id);

commit;
