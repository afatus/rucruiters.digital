/*
  # RLS Politikalarını auth.jwt() ile Güncelle

  Bu migrasyon, jwt() fonksiyonu hatalarını çözmek için tüm RLS politikalarını
  auth.jwt() kullanacak şekilde günceller.

  ## Değişiklikler
  1. Mevcut jwt() kullanan politikaları kaldır
  2. auth.jwt() kullanan yeni politikalar oluştur
  3. it_admin ve super_admin rollerinin doğru erişime sahip olmasını sağla

  ## Etkilenen Tablolar
  - tenants
  - tenant_settings
  - jobs
  - interviews
  - interview_questions
  - video_responses
  - ai_analysis
  - interview_link_logs
  - departments
  - job_categories
  - candidates
  - applications
  - application_stages
  - candidate_documents
  - interview_schedules
  - feedback_forms
  - hiring_pipelines
  - notifications
  - system_metrics
  - profiles
*/

-- Drop existing policies that use jwt()
DROP POLICY IF EXISTS "Super admins and IT admins can manage all tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins and IT admins can manage all tenant settings" ON tenant_settings;
DROP POLICY IF EXISTS "Tenant admins can manage their settings" ON tenant_settings;
DROP POLICY IF EXISTS "Job creators and HR can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Job creators and managers can update jobs" ON jobs;
DROP POLICY IF EXISTS "Recruiters and HR can create jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view jobs based on role and tenant" ON jobs;
DROP POLICY IF EXISTS "Job stakeholders can manage interviews" ON interviews;
DROP POLICY IF EXISTS "Users can view interviews based on role and tenant" ON interviews;
DROP POLICY IF EXISTS "Users can manage interview questions based on role" ON interview_questions;
DROP POLICY IF EXISTS "Users can manage video responses based on role" ON video_responses;
DROP POLICY IF EXISTS "Users can manage AI analysis based on role" ON ai_analysis;
DROP POLICY IF EXISTS "Users can manage interview link logs based on role" ON interview_link_logs;
DROP POLICY IF EXISTS "Departments: HR/IT admins can manage" ON departments;
DROP POLICY IF EXISTS "Job Categories: HR/IT admins can manage" ON job_categories;
DROP POLICY IF EXISTS "Candidates: Recruiters/HR/IT admins can manage" ON candidates;
DROP POLICY IF EXISTS "Applications: Recruiters/HR/IT admins can manage" ON applications;
DROP POLICY IF EXISTS "Application Stages: Recruiters/HR/IT admins can manage" ON application_stages;
DROP POLICY IF EXISTS "Candidate Documents: Recruiters/HR/IT admins can manage" ON candidate_documents;
DROP POLICY IF EXISTS "Interview Schedules: Recruiters/HR/IT admins can manage" ON interview_schedules;
DROP POLICY IF EXISTS "Feedback Forms: Recruiters/HR/IT admins can manage" ON feedback_forms;
DROP POLICY IF EXISTS "Hiring Pipelines: HR/IT admins can manage" ON hiring_pipelines;
DROP POLICY IF EXISTS "Notifications: HR/IT admins can read all" ON notifications;
DROP POLICY IF EXISTS "Notifications: Users can manage their own" ON notifications;
DROP POLICY IF EXISTS "System Metrics: HR/IT admins can read" ON system_metrics;
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles via metadata" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- Create new policies using auth.jwt()

-- Tenants policies
CREATE POLICY "Super admins and IT admins can manage all tenants"
  ON tenants
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

CREATE POLICY "Tenant admins can view their tenant"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT profiles.tenant_id
      FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'tenant_admin'::text
    )
  );

-- Tenant Settings policies
CREATE POLICY "Super admins and IT admins can manage all tenant settings"
  ON tenant_settings
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

CREATE POLICY "Tenant admins can manage their settings"
  ON tenant_settings
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (
      SELECT profiles.tenant_id
      FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'tenant_admin'::text
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT profiles.tenant_id
      FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'tenant_admin'::text
    )
  );

-- Jobs policies
CREATE POLICY "Job creators and HR can delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

CREATE POLICY "Job creators and managers can update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() = hiring_manager_id OR
    auth.uid() = line_manager_id OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    auth.uid() = created_by OR
    auth.uid() = hiring_manager_id OR
    auth.uid() = line_manager_id OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

CREATE POLICY "Recruiters and HR can create jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

CREATE POLICY "Users can view jobs based on role and tenant"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    tenant_id = get_current_tenant_id()
  );

-- Interviews policies
CREATE POLICY "Job stakeholders can manage interviews"
  ON interviews
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    EXISTS (
      SELECT 1
      FROM jobs
      WHERE jobs.id = interviews.job_id AND (
        jobs.created_by = auth.uid() OR
        jobs.hiring_manager_id = auth.uid() OR
        jobs.line_manager_id = auth.uid() OR
        ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text
      )
    )
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    EXISTS (
      SELECT 1
      FROM jobs
      WHERE jobs.id = interviews.job_id AND (
        jobs.created_by = auth.uid() OR
        jobs.hiring_manager_id = auth.uid() OR
        jobs.line_manager_id = auth.uid() OR
        ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text
      )
    )
  );

CREATE POLICY "Users can view interviews based on role and tenant"
  ON interviews
  FOR SELECT
  TO anon, authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    (auth.role() = 'authenticated' AND tenant_id = get_current_tenant_id()) OR
    auth.role() = 'anon'
  );

-- Interview Questions policies
CREATE POLICY "Users can manage interview questions based on role"
  ON interview_questions
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    EXISTS (
      SELECT 1
      FROM jobs
      WHERE jobs.id = interview_questions.job_id AND (
        jobs.created_by = auth.uid() OR
        jobs.hiring_manager_id = auth.uid() OR
        jobs.line_manager_id = auth.uid() OR
        ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text
      )
    )
  );

-- Video Responses policies
CREATE POLICY "Users can manage video responses based on role"
  ON video_responses
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    EXISTS (
      SELECT 1
      FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = video_responses.interview_id AND (
        j.created_by = auth.uid() OR
        j.hiring_manager_id = auth.uid() OR
        j.line_manager_id = auth.uid() OR
        ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text
      )
    )
  );

-- AI Analysis policies
CREATE POLICY "Users can manage AI analysis based on role"
  ON ai_analysis
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    EXISTS (
      SELECT 1
      FROM video_responses vr
      JOIN interviews i ON vr.interview_id = i.id
      JOIN jobs j ON i.job_id = j.id
      WHERE vr.id = ai_analysis.response_id AND (
        j.created_by = auth.uid() OR
        j.hiring_manager_id = auth.uid() OR
        j.line_manager_id = auth.uid() OR
        ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text
      )
    )
  );

-- Interview Link Logs policies
CREATE POLICY "Users can manage interview link logs based on role"
  ON interview_link_logs
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'super_admin'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text OR
    EXISTS (
      SELECT 1
      FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = interview_link_logs.interview_id AND (
        j.created_by = auth.uid() OR
        j.hiring_manager_id = auth.uid() OR
        j.line_manager_id = auth.uid() OR
        ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text
      )
    )
  );

-- Departments policies
CREATE POLICY "Departments: HR/IT admins can manage"
  ON departments
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Job Categories policies
CREATE POLICY "Job Categories: HR/IT admins can manage"
  ON job_categories
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Candidates policies
CREATE POLICY "Candidates: Recruiters/HR/IT admins can manage"
  ON candidates
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Applications policies
CREATE POLICY "Applications: Recruiters/HR/IT admins can manage"
  ON applications
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Application Stages policies
CREATE POLICY "Application Stages: Recruiters/HR/IT admins can manage"
  ON application_stages
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Candidate Documents policies
CREATE POLICY "Candidate Documents: Recruiters/HR/IT admins can manage"
  ON candidate_documents
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Interview Schedules policies
CREATE POLICY "Interview Schedules: Recruiters/HR/IT admins can manage"
  ON interview_schedules
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Feedback Forms policies
CREATE POLICY "Feedback Forms: Recruiters/HR/IT admins can manage"
  ON feedback_forms
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'recruiter'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Hiring Pipelines policies
CREATE POLICY "Hiring Pipelines: HR/IT admins can manage"
  ON hiring_pipelines
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Notifications policies
CREATE POLICY "Notifications: HR/IT admins can read all"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

CREATE POLICY "Notifications: Users can manage their own"
  ON notifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System Metrics policies
CREATE POLICY "System Metrics: HR/IT admins can read"
  ON system_metrics
  FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

-- Profiles policies
CREATE POLICY "HR and IT admins can manage all profiles via metadata"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  )
  WITH CHECK (
    auth.uid() = id OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'hr_operations'::text OR
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'it_admin'::text
  );

CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);