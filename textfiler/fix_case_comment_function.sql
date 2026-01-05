-- Create or replace the admin_add_case_comment function with correct column names

CREATE OR REPLACE FUNCTION public.admin_add_case_comment(
  p_case_id UUID,
  p_comment TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Insert the comment
  INSERT INTO public.case_comments (
    case_id,
    content,
    author_id,
    author_type
  )
  VALUES (
    p_case_id,
    p_comment,
    auth.uid(),
    'admin'
  );
END;
$$;