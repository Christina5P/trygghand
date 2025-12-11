-- Fix GDPR deletion - handle foreign key constraints properly
-- Kör i Supabase SQL Editor

DROP FUNCTION IF EXISTS public.delete_user_data(uuid);

CREATE OR REPLACE FUNCTION public.delete_user_data(user_uuid UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- 1. Radera från fullmakter (först - har FK till users)
  DELETE FROM public.fullmakter 
  WHERE fullmaktsgivare = user_uuid;
  
  -- 2. Radera från cases
  DELETE FROM public.cases 
  WHERE customer_id = user_uuid;
  
  -- 3. Radera från subscriptions
  DELETE FROM public.subscriptions 
  WHERE customer_id = user_uuid;
  
  -- 4. Radera från customers
  DELETE FROM public.customers 
  WHERE id = user_uuid;
  
  -- 5. Radera från archived_customers
  DELETE FROM public.archived_customers 
  WHERE id = user_uuid;
  
  RETURN QUERY SELECT true::BOOLEAN, 'User data deleted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifiera att funktionen existerar
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'delete_user_data';
