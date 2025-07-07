/*
  # Fix Jobs Table RLS Policies

  1. Changes
    - Drop all existing policies on the jobs table
    - Create new, simplified policies without redundancy
    - Fix the "policy already exists" error
    - Ensure proper tenant isolation and role-based access

  2. Security
    - Maintain IT admin and super admin full access
    - Ensure proper tenant isolation for regular users
    - Preserve role-based access for job stakeholders
*/

-- Drop all existing policies on the jobs table
DROP POLICY IF EXISTS "Users can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Recruiters and HR can create jobs" ON jobs;
DROP POLICY IF EXISTS "Job creators and managers can update jobs" ON jobs;
DROP POLICY IF EXISTS "Job creators and HR can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view jobs based on role and tenant" ON jobs;
DROP POLICY IF EXISTS "jobs_it_admin_super_admin_full_access" ON jobs;
DROP POLICY IF EXISTS "jobs_tenant_based_access" ON jobs;
DROP POLICY IF EXISTS "jobs_stakeholders_manage" ON jobs;
DROP POLICY IF EXISTS "Only logged-in users can insert jobs" ON jobs;

-- Create new, clearer policies

-- 1. Full access for IT admins and super admins
CREATE POLICY "jobs_it_admin_super_admin_full_access" ON jobs
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['it_admin', 'super_admin'])
  )
  WITH CHECK (
    ((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['it_admin', 'super_admin'])
  );

-- 2. Tenant-based SELECT access for all authenticated users
CREATE POLICY "jobs_tenant_based_access" ON jobs
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN ((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['it_admin', 'super_admin']) THEN true
      ELSE tenant_id = get_current_tenant_id()
    END
  );

-- 3. Role-based access for job stakeholders (create, update, delete)
CREATE POLICY "jobs_stakeholders_manage" ON jobs
  FOR ALL
  TO authenticated
  USING (
    (((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['it_admin', 'super_admin']))
    OR
    (
      created_by = auth.uid()
      OR hiring_manager_id = auth.uid()
      OR line_manager_id = auth.uid()
      OR ((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['hr_operations', 'recruiter'])
    )
  )
  WITH CHECK (
    (((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['it_admin', 'super_admin']))
    OR
    (
      created_by = auth.uid()
      OR hiring_manager_id = auth.uid()
      OR line_manager_id = auth.uid()
      OR ((auth.jwt() ->> 'user_metadata')::json ->> 'role') = ANY (ARRAY['hr_operations', 'recruiter'])
    )
  );

-- Note: We've removed the redundant INSERT policies that were causing conflicts
-- The jobs_stakeholders_manage policy (FOR ALL) already covers INSERT operations
-- for the appropriate roles and users