/*
  # Fix user roles view permissions

  1. Security
    - Create a secure view that can access auth.users table
    - Grant proper permissions for the view
    - Enable security definer to allow access to auth schema

  2. Changes
    - Drop existing user_roles view if it exists
    - Create new user_roles view with security definer
    - Grant select permissions to authenticated users
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.user_roles;

-- Create a secure view with security definer to access auth.users
CREATE OR REPLACE VIEW public.user_roles
WITH (security_definer = true)
AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.department,
  p.created_at as profile_created_at,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- Grant select permission to authenticated users
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO service_role;

-- Create a function to get all users (alternative approach)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  department text,
  profile_created_at timestamptz,
  user_created_at timestamptz
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    p.full_name,
    p.role,
    p.department,
    p.created_at as profile_created_at,
    u.created_at as user_created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO service_role;