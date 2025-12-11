-- Kolla om christina.ahman@outlook.com finns i customers tabellen
-- Kör i Supabase SQL Editor

-- 1. Kolla i auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'christina.ahman@outlook.com';

-- 2. Kolla i customers tabellen
SELECT id, email, name, is_admin, is_customer, created_at 
FROM customers 
WHERE email = 'christina.ahman@outlook.com';

-- 3. Kolla om ID:t finns (d150c04b-ec13-4485-aca5-ed0d99f664e0)
SELECT id, email, name, is_admin, is_customer 
FROM customers 
WHERE id = 'd150c04b-ec13-4485-aca5-ed0d99f664e0';

-- 4. Om användaren saknas i customers, lägg till:
INSERT INTO customers (id, email, name, is_admin, is_customer, created_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', email) as name,
    true as is_admin,
    false as is_customer,
    created_at
FROM auth.users
WHERE email = 'christina.ahman@outlook.com'
ON CONFLICT (id) DO UPDATE 
SET is_admin = true;

-- 5. Verifiera
SELECT id, email, name, is_admin 
FROM customers 
WHERE email = 'christina.ahman@outlook.com';
