/*
  # Allow IT Admins to Manage Tenants

  1. Changes
    - Update the tenants RLS policy to allow both 'super_admin' and 'it_admin' roles
    - This enables IT administrators to create, read, update, and delete tenants

  2. Security
    - Maintains security by only allowing specific admin roles
    - Uses JWT metadata to verify user roles
*/

-- Drop the existing policy that restricts tenant management to super_admin only
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;

-- Recreate the policy to allow both 'super_admin' and 'it_admin' roles to manage all tenants
CREATE POLICY "Super admins and IT admins can manage all tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

-- Also update the tenant_settings policy to allow IT admins
DROP POLICY IF EXISTS "Super admins can manage all tenant settings" ON public.tenant_settings;

CREATE POLICY "Super admins and IT admins can manage all tenant settings" ON public.tenant_settings
  FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

-- Verify the policies are updated
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('tenants', 'tenant_settings')
ORDER BY tablename, policyname;