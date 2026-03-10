-- Fix RLS on case_comments and cases so customer reads work when
-- customers.id != auth.uid() (admin-created customers where id = gen_random_uuid()).
--
-- The original policies used:  cases.customer_id = auth.uid()
-- But cases.customer_id = customers.id (PK), not auth.uid().
-- customers.user_id is the column that holds auth.uid() (set by trigger/migration).
--
-- Every policy that gates customer access via "customer_id = auth.uid()" must instead
-- join through customers: customers.id = <column> AND customers.user_id = auth.uid().

begin;

-- 1. case_comments: customer SELECT
drop policy if exists case_comments_select_customer_own_cases on public.case_comments;
create policy case_comments_select_customer_own_cases
  on public.case_comments
  for select
  to authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.cases c
      join public.customers cu on cu.id = c.customer_id
      where c.id = case_comments.case_id
        and c.deleted_at is null
        and cu.user_id = auth.uid()
    )
  );

-- 2. case_comments: customer INSERT
drop policy if exists case_comments_insert_customer_own_case on public.case_comments;
create policy case_comments_insert_customer_own_case
  on public.case_comments
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and author_type = 'customer'
    and deleted_at is null
    and exists (
      select 1
      from public.cases c
      join public.customers cu on cu.id = c.customer_id
      where c.id = case_comments.case_id
        and c.deleted_at is null
        and cu.user_id = auth.uid()
    )
  );

-- 3. cases: customer SELECT (if a policy exists that does customer_id = auth.uid())
-- Drop and re-create only if the old policy exists.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cases'
      and policyname = 'cases_select_customer_own'
  ) then
    drop policy cases_select_customer_own on public.cases;
    create policy cases_select_customer_own
      on public.cases
      for select
      to authenticated
      using (
        deleted_at is null
        and exists (
          select 1 from public.customers cu
          where cu.id = cases.customer_id
            and cu.user_id = auth.uid()
        )
      );
  end if;
end;
$$;

commit;
