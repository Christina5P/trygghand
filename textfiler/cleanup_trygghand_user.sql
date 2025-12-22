-- Rensa upp Trygg Hand (trygghandkontakt@gmail.com)
-- Denna user är inte synkad med Supabase customers

-- 1. Hitta user ID från auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'trygghandkontakt@gmail.com';

-- 2. När du har ID:t, ersätt det här och kör resten:
-- SET @user_id = 'REPLACE_WITH_USER_ID';

-- 3. Radera från fullmakter
DELETE FROM public.fullmakter 
WHERE fullmaktsgivare = 'REPLACE_WITH_USER_ID';

-- 4. Radera från cases
DELETE FROM public.cases 
WHERE customer_id = 'REPLACE_WITH_USER_ID';

-- 5. Radera från subscriptions
DELETE FROM public.subscriptions 
WHERE customer_id = 'REPLACE_WITH_USER_ID';

-- 6. Radera från customers (om den finns)
DELETE FROM public.customers 
WHERE id = 'REPLACE_WITH_USER_ID';

-- 7. Radera från archived_customers
DELETE FROM public.archived_customers 
WHERE id = 'REPLACE_WITH_USER_ID';

-- 8. Verifiera att allt är borta
SELECT 'fullmakter' as table_name, COUNT(*) as remaining FROM public.fullmakter WHERE fullmaktsgivare = 'REPLACE_WITH_USER_ID'
UNION ALL
SELECT 'cases', COUNT(*) FROM public.cases WHERE customer_id = 'REPLACE_WITH_USER_ID'
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM public.subscriptions WHERE customer_id = 'REPLACE_WITH_USER_ID'
UNION ALL
SELECT 'customers', COUNT(*) FROM public.customers WHERE id = 'REPLACE_WITH_USER_ID'
UNION ALL
SELECT 'archived_customers', COUNT(*) FROM public.archived_customers WHERE id = 'REPLACE_WITH_USER_ID';

-- 9. Sedan manuellt radera från auth.users via Supabase UI:
-- Gå till Authentication > Users och radera trygghandkontakt@gmail.com
