/*
  # Fix user management permissions

  1. Problem
    - The user_roles view cannot access auth.users table due to RLS restrictions
    - Need proper security definer function to access auth schema

  2. Solution
    - Create a security definer function that can access auth.users
    - Update the view to use standard PostgreSQL syntax
    - Grant proper permissions for user management

  3. Security
    - Function runs with definer privileges to access auth schema
    - Proper grants for authenticated and service_role users
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.user_roles;

-- Create a security definer function to get all users
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

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO service_role;

-- Create a simpler view that uses the function
CREATE OR REPLACE VIEW public.user_roles AS
SELECT * FROM public.get_all_users_admin();

-- Grant select permission to authenticated users and service role
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO service_role;

-- Create additional helper function for tenant-aware user management
CREATE OR REPLACE FUNCTION public.get_tenant_users(tenant_uuid uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  department text,
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
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
    p.tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    p.created_at as profile_created_at,
    u.created_at as user_created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  LEFT JOIN public.tenants t ON p.tenant_id = t.id
  WHERE (tenant_uuid IS NULL OR p.tenant_id = tenant_uuid)
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission for tenant users function
GRANT EXECUTE ON FUNCTION public.get_tenant_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_users(uuid) TO service_role;

-- Create tenant-aware user roles view
CREATE OR REPLACE VIEW public.tenant_user_roles AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.department,
  p.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  p.created_at as profile_created_at,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.tenants t ON p.tenant_id = t.id;

-- Grant select permission for tenant user roles view
GRANT SELECT ON public.tenant_user_roles TO authenticated;
GRANT SELECT ON public.tenant_user_roles TO service_role;