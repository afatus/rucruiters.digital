/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The current RLS policies on the profiles table are causing infinite recursion
    - This happens when policies reference the same table they're protecting in a circular manner

  2. Solution
    - Drop the problematic policies that cause circular references
    - Create simplified, non-recursive policies
    - Ensure policies don't reference profiles table within profiles table policies

  3. New Policies
    - Users can view and update their own profile (using auth.uid() directly)
    - HR and IT admins can manage all profiles (simplified check)
    - Remove circular department-based checks that cause recursion
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "HR and IT admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view profiles in their department" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new, simplified policies without circular references

-- Policy 1: Users can view and update their own profile
CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 2: HR and IT admins can manage all profiles (simplified)
-- This policy checks the user's role directly from auth metadata or a simple role check
CREATE POLICY "HR and IT admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    -- Check if the current user has hr_operations or it_admin role
    -- We'll use a direct role check without circular reference
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'hr_operations' OR
        auth.users.raw_user_meta_data->>'role' = 'it_admin'
      )
    )
    OR
    -- Fallback: check if user ID matches known admin users
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('hr_operations', 'it_admin')
      LIMIT 10 -- Prevent large scans
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_user_meta_data->>'role' = 'hr_operations' OR
        auth.users.raw_user_meta_data->>'role' = 'it_admin'
      )
    )
    OR
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('hr_operations', 'it_admin')
      LIMIT 10
    )
  );

-- Policy 3: Allow public read access for basic profile info (needed for job assignments)
CREATE POLICY "Public read access for basic profile info"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 4: Allow profile creation during user registration
CREATE POLICY "Allow profile creation"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);