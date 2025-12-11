-- Set admin privileges for Christina
-- Kör detta i Supabase SQL Editor

-- Sätt is_admin = true för christina.ahman@outlook.com
UPDATE customers 
SET is_admin = true 
WHERE email = 'christina.ahman@outlook.com';

-- Verifiera att det fungerade
SELECT id, email, name, is_admin 
FROM customers 
WHERE email = 'christina.ahman@outlook.com';
