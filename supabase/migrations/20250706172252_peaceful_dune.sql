/*
  # Fix RLS policies for admin access

  1. Security Updates
    - Update jobs table policy to allow it_admin and super_admin to see all jobs
    - Replace overly permissive interviews policy with secure role-based access
    - Update related table policies for video_responses, ai_analysis, interview_questions, and interview_link_logs
    
  2. Function Updates
    - Update get_current_tenant_id function to bypass tenant filtering for admin roles
    
  3. Policy Changes
    - Super admins and IT admins can see all data across tenants
    - Other users are restricted to their tenant's data
    - Anonymous users can still access interviews by direct link for candidates
*/

-- Update the jobs table SELECT policy to include it_admin
DROP POLICY IF EXISTS "Users can view jobs in their tenant" ON jobs;

CREATE POLICY "Users can view jobs based on role and tenant"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins and IT admins can see all jobs
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Other users can only see jobs in their tenant
    (tenant_id = get_current_tenant_id())
  );

-- Drop the overly permissive interviews SELECT policy
DROP POLICY IF EXISTS "Anyone can view interviews by link" ON interviews;

-- Create a new, more secure interviews SELECT policy
CREATE POLICY "Users can view interviews based on role and tenant"
  ON interviews
  FOR SELECT
  TO authenticated, anon
  USING (
    -- Super admins and IT admins can see all interviews
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Other authenticated users can see interviews in their tenant
    (auth.role() = 'authenticated' AND tenant_id = get_current_tenant_id()) OR
    -- Anonymous users can access interviews by direct link (for candidates)
    (auth.role() = 'anon')
  );

-- Ensure the get_current_tenant_id function exists and works properly
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For super_admin and it_admin, return null to bypass tenant filtering
  IF ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('super_admin', 'it_admin') THEN
    RETURN null;
  END IF;
  
  -- For other users, get tenant_id from their profile
  RETURN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Update the video_responses table policy to allow admin access
DROP POLICY IF EXISTS "Job stakeholders can manage video responses" ON video_responses;

CREATE POLICY "Users can manage video responses based on role"
  ON video_responses
  FOR ALL
  TO authenticated
  USING (
    -- Super admins and IT admins can manage all video responses
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Job stakeholders can manage responses for their jobs
    (EXISTS (
      SELECT 1
      FROM (interviews i JOIN jobs j ON ((i.job_id = j.id)))
      WHERE ((i.id = video_responses.interview_id) AND 
             ((j.created_by = auth.uid()) OR 
              (j.hiring_manager_id = auth.uid()) OR 
              (j.line_manager_id = auth.uid()) OR 
              (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text)))
    ))
  );

-- Update the ai_analysis table policy to allow admin access
DROP POLICY IF EXISTS "Job stakeholders can manage AI analysis" ON ai_analysis;

CREATE POLICY "Users can manage AI analysis based on role"
  ON ai_analysis
  FOR ALL
  TO authenticated
  USING (
    -- Super admins and IT admins can manage all AI analysis
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Job stakeholders can manage analysis for their jobs
    (EXISTS (
      SELECT 1
      FROM ((video_responses vr JOIN interviews i ON ((vr.interview_id = i.id)))
            JOIN jobs j ON ((i.job_id = j.id)))
      WHERE ((vr.id = ai_analysis.response_id) AND 
             ((j.created_by = auth.uid()) OR 
              (j.hiring_manager_id = auth.uid()) OR 
              (j.line_manager_id = auth.uid()) OR 
              (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text)))
    ))
  );

-- Update the interview_questions table policy to allow admin access
DROP POLICY IF EXISTS "Job stakeholders can manage questions" ON interview_questions;

CREATE POLICY "Users can manage interview questions based on role"
  ON interview_questions
  FOR ALL
  TO authenticated
  USING (
    -- Super admins and IT admins can manage all questions
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Job stakeholders can manage questions for their jobs
    (EXISTS (
      SELECT 1
      FROM jobs
      WHERE ((jobs.id = interview_questions.job_id) AND 
             ((jobs.created_by = auth.uid()) OR 
              (jobs.hiring_manager_id = auth.uid()) OR 
              (jobs.line_manager_id = auth.uid()) OR 
              (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text)))
    ))
  );

-- Update the interview_link_logs table policy to allow admin access
DROP POLICY IF EXISTS "Job stakeholders can manage link logs" ON interview_link_logs;

CREATE POLICY "Users can manage interview link logs based on role"
  ON interview_link_logs
  FOR ALL
  TO authenticated
  USING (
    -- Super admins and IT admins can manage all link logs
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Job stakeholders can manage link logs for their jobs
    (EXISTS (
      SELECT 1
      FROM (interviews i JOIN jobs j ON ((i.job_id = j.id)))
      WHERE ((i.id = interview_link_logs.interview_id) AND 
             ((j.created_by = auth.uid()) OR 
              (j.hiring_manager_id = auth.uid()) OR 
              (j.line_manager_id = auth.uid()) OR 
              (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text)))
    ))
  );

-- Also update the existing jobs policies to use correct JWT function
DROP POLICY IF EXISTS "Job creators and managers can update jobs" ON jobs;

CREATE POLICY "Job creators and managers can update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = created_by) OR 
    (auth.uid() = hiring_manager_id) OR 
    (auth.uid() = line_manager_id) OR 
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text) OR 
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text)
  )
  WITH CHECK (
    (auth.uid() = created_by) OR 
    (auth.uid() = hiring_manager_id) OR 
    (auth.uid() = line_manager_id) OR 
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text) OR 
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text)
  );

DROP POLICY IF EXISTS "Job creators and HR can delete jobs" ON jobs;

CREATE POLICY "Job creators and HR can delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = created_by) OR 
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text) OR 
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text)
  );

-- Update existing interviews policies to use correct JWT function
DROP POLICY IF EXISTS "Job stakeholders can manage interviews" ON interviews;

CREATE POLICY "Job stakeholders can manage interviews"
  ON interviews
  FOR ALL
  TO authenticated
  USING (
    -- Super admins and IT admins can manage all interviews
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Job stakeholders can manage interviews for their jobs
    (EXISTS (
      SELECT 1
      FROM jobs
      WHERE ((jobs.id = interviews.job_id) AND 
             ((jobs.created_by = auth.uid()) OR 
              (jobs.hiring_manager_id = auth.uid()) OR 
              (jobs.line_manager_id = auth.uid()) OR 
              (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text)))
    ))
  )
  WITH CHECK (
    -- Super admins and IT admins can manage all interviews
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text) OR
    -- Job stakeholders can manage interviews for their jobs
    (EXISTS (
      SELECT 1
      FROM jobs
      WHERE ((jobs.id = interviews.job_id) AND 
             ((jobs.created_by = auth.uid()) OR 
              (jobs.hiring_manager_id = auth.uid()) OR 
              (jobs.line_manager_id = auth.uid()) OR 
              (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text)))
    ))
  );