-- ========================================
-- GDPR USER DELETION FUNCTION
-- ========================================
-- Säker borttagning av användare och all relaterad data
-- Kör detta script i Supabase SQL Editor

-- 1) Skapa tabell för att logga borttagna användare (för compliance)
CREATE TABLE IF NOT EXISTS deleted_users_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT,
    deleted_by UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    data_backup JSONB -- backup av användarens data före borttagning
);

-- 2) RLS Policy - endast admin kan läsa deletion logs
ALTER TABLE deleted_users_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_can_view_deletion_logs"
ON deleted_users_log
FOR SELECT
USING (
    (SELECT is_admin FROM public.customers WHERE id = auth.uid()) = true
);

-- 3) Function för att radera användare och all data (GDPR-compliant)
CREATE OR REPLACE FUNCTION delete_user_gdpr(user_id UUID, reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    user_email TEXT;
    deletion_count INT := 0;
BEGIN
    -- Hämta användarens email
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    
    IF user_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Logga borttagningen INNAN vi raderar
    INSERT INTO deleted_users_log (user_id, email, deleted_by, reason)
    VALUES (user_id, user_email, auth.uid(), COALESCE(reason, 'GDPR deletion request'));

    -- Radera ärenden relaterade till användaren
    DELETE FROM cases WHERE customer_id = user_id;
    
    -- Radera case_comments
    DELETE FROM case_comments WHERE user_id = user_id;
    
    -- Radera prenumerationer
    DELETE FROM subscriptions WHERE customer_id = user_id;
    
    -- Radera subscription_cancellations
    DELETE FROM subscription_cancellations WHERE customer_id = user_id;
    
    -- Radera cancellation_comments
    DELETE FROM cancellation_comments WHERE user_id = user_id;
    
    -- Radera kontaktförfrågningar
    DELETE FROM contact_requests WHERE customer_id = user_id;
    
    -- Radera värderingar
    DELETE FROM valuations WHERE customer_id = user_id;
    
    -- Radera fullmakter
    DELETE FROM fullmakter WHERE fullmaktsgivare = user_id OR fullmakthavare = user_id;
    
    -- Radera från customers
    DELETE FROM customers WHERE id = user_id;
    
    -- Radera från archived_customers
    DELETE FROM archived_customers WHERE id = user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'User and all related data deleted successfully',
        'user_email', user_email,
        'deleted_at', NOW()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Grant function access only to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_gdpr(UUID, TEXT) TO authenticated;

-- ========================================
-- ANVÄND FUNKTIONEN FRÅN REACT
-- ========================================
-- Från React/TypeScript: await supabase.rpc('delete_user_gdpr', { user_id: userId, reason: 'User requested deletion' })
