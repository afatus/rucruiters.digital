/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "HR and IT admins can manage all profiles" policy has infinite recursion
    - It queries the profiles table within its own policy condition
    - This causes all profile-related queries to fail

  2. Solution
    - Remove the problematic policy that causes recursion
    - Create simpler, non-recursive policies
    - Use auth.jwt() claims or user metadata instead of querying profiles table
    - Ensure users can manage their own profiles
    - Allow public read access for basic profile info (as intended)

  3. New Policies
    - Users can manage their own profile
    - Public read access for authenticated users
    - Simple profile creation policy
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles" ON profiles;

-- Keep the existing working policies
-- "Users can manage own profile" - already exists and works
-- "Public read access for basic profile info" - already exists and works  
-- "Allow profile creation" - already exists and works

-- Create a new policy for HR and IT admins that doesn't cause recursion
-- This policy uses auth.jwt() to check user metadata instead of querying profiles table
CREATE POLICY "HR and IT admins can manage all profiles via metadata"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    -- Users can manage their own profile
    (auth.uid() = id) 
    OR 
    -- HR and IT admins can manage all profiles (check via user metadata)
    (
      (auth.jwt() -> 'user_metadata' ->> 'role' = 'hr_operations') 
      OR 
      (auth.jwt() -> 'user_metadata' ->> 'role' = 'it_admin')
    )
  )
  WITH CHECK (
    -- Same conditions for insert/update
    (auth.uid() = id) 
    OR 
    (
      (auth.jwt() -> 'user_metadata' ->> 'role' = 'hr_operations') 
      OR 
      (auth.jwt() -> 'user_metadata' ->> 'role' = 'it_admin')
    )
  );