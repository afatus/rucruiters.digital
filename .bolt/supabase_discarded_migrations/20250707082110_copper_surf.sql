/*
  # Fix get_current_tenant_id Function with SECURITY DEFINER

  1. Problem
    - The get_current_tenant_id function is not working correctly with RLS policies
    - Users cannot see interviews in their tenant due to permission issues
    - The function needs to run with elevated privileges to bypass RLS checks

  2. Solution
    - Update the function to use SECURITY DEFINER
    - Add SET search_path to prevent search path injection
    - Ensure proper tenant isolation while allowing admins to see all data

  3. Security
    - Function will run with the privileges of its owner (postgres/supabase_admin)
    - This allows it to read from profiles table regardless of RLS policies
    - Still maintains tenant isolation in the business logic
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_current_tenant_id();

-- Create a new version with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_tenant_id uuid;
  user_role text;
BEGIN
  -- Get the user's role from JWT metadata
  user_role := (auth.jwt() ->> 'user_metadata')::json ->> 'role';
  
  -- Super admins and IT admins can see all tenants (return null to bypass tenant filtering)
  IF user_role IN ('super_admin', 'it_admin') THEN
    RETURN NULL;
  END IF;
  
  -- For other users, get tenant_id from their profile
  SELECT tenant_id INTO user_tenant_id
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_tenant_id;
END;
$$;

-- Update the interviews table policies to ensure they work with the updated function
DROP POLICY IF EXISTS "tenant_based_access" ON interviews;

CREATE POLICY "tenant_based_access" ON interviews
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN ((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['it_admin', 'super_admin']) THEN true
      ELSE tenant_id = get_current_tenant_id()
    END
  );