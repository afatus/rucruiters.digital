/*
  # Fix RLS Policy Infinite Recursion

  1. Problem Resolution
    - Removes circular dependencies in RLS policies
    - Uses JWT metadata instead of profiles table queries
    - Maintains security while preventing infinite recursion

  2. Changes Made
    - Drop all existing problematic policies
    - Create new policies using auth.jwt() for role checks
    - Simplify policy structure to avoid circular references

  3. Security
    - Maintains role-based access control
    - Uses JWT metadata for admin role verification
    - Preserves data isolation between users
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles via metadata" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "HR and IT admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view profiles in their department" ON profiles;
DROP POLICY IF EXISTS "Public read access for basic profile info" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- Create new, simplified policies without circular references

-- Policy 1: Users can read all profiles (needed for manager assignments, etc.)
CREATE POLICY "Authenticated users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Users can create and update their own profile
CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: HR and IT admins can manage all profiles (using JWT metadata to avoid recursion)
CREATE POLICY "HR and IT admins can manage all profiles via metadata"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    (auth.uid() = id) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  )
  WITH CHECK (
    (auth.uid() = id) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

-- Update other table policies to use JWT metadata instead of profiles table queries

-- Jobs table policies
DROP POLICY IF EXISTS "Recruiters and HR can create jobs" ON jobs;
DROP POLICY IF EXISTS "Job creators and managers can update jobs" ON jobs;
DROP POLICY IF EXISTS "Job creators and HR can delete jobs" ON jobs;

CREATE POLICY "Recruiters and HR can create jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

CREATE POLICY "Job creators and managers can update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = created_by) OR
    (auth.uid() = hiring_manager_id) OR
    (auth.uid() = line_manager_id) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  )
  WITH CHECK (
    (auth.uid() = created_by) OR
    (auth.uid() = hiring_manager_id) OR
    (auth.uid() = line_manager_id) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

CREATE POLICY "Job creators and HR can delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = created_by) OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

-- Interview questions policies
DROP POLICY IF EXISTS "Job stakeholders can manage questions" ON interview_questions;

CREATE POLICY "Job stakeholders can manage questions"
  ON interview_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interview_questions.job_id 
      AND (
        (jobs.created_by = auth.uid()) OR
        (jobs.hiring_manager_id = auth.uid()) OR
        (jobs.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interview_questions.job_id 
      AND (
        (jobs.created_by = auth.uid()) OR
        (jobs.hiring_manager_id = auth.uid()) OR
        (jobs.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  );

-- Interviews policies
DROP POLICY IF EXISTS "Job stakeholders can manage interviews" ON interviews;

CREATE POLICY "Job stakeholders can manage interviews"
  ON interviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interviews.job_id 
      AND (
        (jobs.created_by = auth.uid()) OR
        (jobs.hiring_manager_id = auth.uid()) OR
        (jobs.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interviews.job_id 
      AND (
        (jobs.created_by = auth.uid()) OR
        (jobs.hiring_manager_id = auth.uid()) OR
        (jobs.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  );

-- Video responses policies
DROP POLICY IF EXISTS "Job stakeholders can manage video responses" ON video_responses;

CREATE POLICY "Job stakeholders can manage video responses"
  ON video_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = video_responses.interview_id
      AND (
        (j.created_by = auth.uid()) OR
        (j.hiring_manager_id = auth.uid()) OR
        (j.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  );

-- AI analysis policies
DROP POLICY IF EXISTS "Job stakeholders can manage AI analysis" ON ai_analysis;

CREATE POLICY "Job stakeholders can manage AI analysis"
  ON ai_analysis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM video_responses vr
      JOIN interviews i ON vr.interview_id = i.id
      JOIN jobs j ON i.job_id = j.id
      WHERE vr.id = ai_analysis.response_id
      AND (
        (j.created_by = auth.uid()) OR
        (j.hiring_manager_id = auth.uid()) OR
        (j.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  );

-- Interview link logs policies
DROP POLICY IF EXISTS "Job stakeholders can manage link logs" ON interview_link_logs;

CREATE POLICY "Job stakeholders can manage link logs"
  ON interview_link_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = interview_link_logs.interview_id
      AND (
        (j.created_by = auth.uid()) OR
        (j.hiring_manager_id = auth.uid()) OR
        (j.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = interview_link_logs.interview_id
      AND (
        (j.created_by = auth.uid()) OR
        (j.hiring_manager_id = auth.uid()) OR
        (j.line_manager_id = auth.uid()) OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
        ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
      )
    )
  );

-- Update the handle_new_user function to set user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'recruiter')
  );
  
  -- Update user metadata to include role for JWT access
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', COALESCE(new.raw_user_meta_data->>'role', 'recruiter'))
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to sync profile role changes to user metadata
CREATE OR REPLACE FUNCTION public.sync_user_metadata()
RETURNS trigger AS $$
BEGIN
  -- Update user metadata when profile role changes
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync role changes
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON profiles;
CREATE TRIGGER sync_user_metadata_trigger
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata();

-- Update existing users' metadata
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', COALESCE(p.role, 'recruiter'))
FROM profiles p 
WHERE auth.users.id = p.id;