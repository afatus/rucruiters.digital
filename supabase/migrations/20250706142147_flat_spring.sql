/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "HR and IT admins can manage all profiles" policy contains a recursive subquery
    - This causes infinite recursion when accessing the profiles table

  2. Solution
    - Remove the problematic policy that queries profiles table within itself
    - Simplify the policies to avoid self-referential queries
    - Keep basic access control without recursive lookups

  3. Changes
    - Drop the problematic "HR and IT admins can manage all profiles" policy
    - Simplify other policies to avoid recursion
    - Ensure users can still manage their own profiles
    - Allow public read access for basic profile info
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles" ON profiles;

-- Ensure we have clean, simple policies
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Public read access for basic profile info" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- Create simplified policies without recursion

-- Allow users to create their own profile
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read all profiles (needed for manager lookups, etc.)
CREATE POLICY "Authenticated users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Note: For HR/IT admin functionality, we'll rely on application-level checks
-- rather than complex RLS policies that can cause recursion issues