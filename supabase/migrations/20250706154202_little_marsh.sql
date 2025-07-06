/*
  # Add ATS (Applicant Tracking System) Schema

  1. New Tables
    - `departments` - Company departments with budget and headcount limits
    - `job_categories` - Hierarchical job categorization system
    - `candidates` - Comprehensive candidate profiles with GDPR compliance
    - `applications` - Job applications linking candidates to jobs
    - `application_stages` - Track application progress through hiring pipeline
    - `candidate_documents` - Store candidate resumes, portfolios, certificates
    - `interview_schedules` - Schedule and manage interviews
    - `feedback_forms` - Collect structured interview feedback
    - `hiring_pipelines` - Define custom hiring workflows per job
    - `notifications` - System notifications for users
    - `audit_logs` - Track all system changes for compliance
    - `system_metrics` - Store analytics and performance metrics

  2. Enhanced Tables
    - `jobs` table: Add ATS-specific columns (department, category, salary, skills, etc.)

  3. Security
    - Enable RLS on all new tables
    - Add comprehensive policies for role-based access control
    - Ensure data isolation and proper permissions

  4. Indexes
    - Add performance indexes for common queries
    - Optimize for search and filtering operations
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  budget numeric,
  headcount_limit integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_categories table
CREATE TABLE IF NOT EXISTS job_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES job_categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  current_location text,
  preferred_location text,
  current_salary numeric,
  expected_salary numeric,
  experience_years integer NOT NULL,
  education_level text CHECK (education_level IN ('high_school', 'bachelor', 'master', 'phd', 'other')),
  skills text[],
  languages jsonb, -- Array of objects {language: string, level: string}
  availability_date timestamptz,
  source text,
  referrer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  gdpr_consent boolean NOT NULL,
  gdpr_consent_date timestamptz,
  is_blacklisted boolean DEFAULT false,
  blacklist_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alter jobs table to add ATS related columns
DO $$
BEGIN
  -- Add department_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;

  -- Add category_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN category_id uuid REFERENCES job_categories(id) ON DELETE SET NULL;
  END IF;

  -- Add employment_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN employment_type text CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance'));
  END IF;

  -- Add location column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'location'
  ) THEN
    ALTER TABLE jobs ADD COLUMN location text;
  END IF;

  -- Add remote_work column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'remote_work'
  ) THEN
    ALTER TABLE jobs ADD COLUMN remote_work text CHECK (remote_work IN ('office', 'remote', 'hybrid'));
  END IF;

  -- Add salary_min column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'salary_min'
  ) THEN
    ALTER TABLE jobs ADD COLUMN salary_min numeric;
  END IF;

  -- Add salary_max column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'salary_max'
  ) THEN
    ALTER TABLE jobs ADD COLUMN salary_max numeric;
  END IF;

  -- Add currency column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'currency'
  ) THEN
    ALTER TABLE jobs ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  -- Add required_skills column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'required_skills'
  ) THEN
    ALTER TABLE jobs ADD COLUMN required_skills text[];
  END IF;

  -- Add preferred_skills column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'preferred_skills'
  ) THEN
    ALTER TABLE jobs ADD COLUMN preferred_skills text[];
  END IF;

  -- Add experience_min column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'experience_min'
  ) THEN
    ALTER TABLE jobs ADD COLUMN experience_min integer;
  END IF;

  -- Add experience_max column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'experience_max'
  ) THEN
    ALTER TABLE jobs ADD COLUMN experience_max integer;
  END IF;

  -- Add education_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'education_level'
  ) THEN
    ALTER TABLE jobs ADD COLUMN education_level text CHECK (education_level IN ('high_school', 'bachelor', 'master', 'phd', 'other'));
  END IF;

  -- Add application_deadline column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'application_deadline'
  ) THEN
    ALTER TABLE jobs ADD COLUMN application_deadline timestamptz;
  END IF;

  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'status'
  ) THEN
    ALTER TABLE jobs ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed', 'cancelled'));
  END IF;

  -- Add published_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('applied', 'screening', 'phone_interview', 'technical_interview', 'final_interview', 'reference_check', 'offer_made', 'offer_accepted', 'offer_declined', 'hired', 'rejected', 'withdrawn')),
  current_stage text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source text,
  cover_letter text,
  resume_url text,
  application_score integer,
  ai_screening_score integer,
  ai_screening_notes text,
  assigned_recruiter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  applied_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create application_stages table
CREATE TABLE IF NOT EXISTS application_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  stage_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  feedback jsonb,
  score integer,
  interviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create candidate_documents table
CREATE TABLE IF NOT EXISTS candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN ('resume', 'cover_letter', 'portfolio', 'certificate', 'reference', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  uploaded_at timestamptz DEFAULT now()
);

-- Create interview_schedules table
CREATE TABLE IF NOT EXISTS interview_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  interview_type text NOT NULL CHECK (interview_type IN ('phone_screening', 'video_call', 'technical', 'behavioral', 'final', 'panel')),
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  location text,
  interviewer_ids text[], -- Array of UUIDs (string representation)
  candidate_confirmed boolean DEFAULT false,
  interviewer_confirmed boolean DEFAULT false,
  status text NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  meeting_notes text,
  recording_url text,
  feedback_submitted boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create feedback_forms table
CREATE TABLE IF NOT EXISTS feedback_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  interview_schedule_id uuid REFERENCES interview_schedules(id) ON DELETE SET NULL,
  interviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  overall_rating integer,
  technical_skills_rating integer,
  communication_rating integer,
  cultural_fit_rating integer,
  strengths text,
  weaknesses text,
  detailed_feedback text,
  recommendation text CHECK (recommendation IN ('strong_hire', 'hire', 'no_hire', 'strong_no_hire')),
  would_work_with boolean,
  submitted_at timestamptz DEFAULT now()
);

-- Create hiring_pipelines table
CREATE TABLE IF NOT EXISTS hiring_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  stage_name text NOT NULL,
  stage_order integer NOT NULL,
  is_required boolean DEFAULT true,
  auto_advance boolean DEFAULT false,
  sla_hours integer,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('application_received', 'interview_scheduled', 'feedback_required', 'offer_made', 'candidate_hired', 'deadline_approaching', 'system_alert')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  priority text NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  tags jsonb,
  recorded_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_job_categories_parent ON job_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_job_categories_active ON job_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidates_experience ON candidates(experience_years);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON candidates(current_location);
CREATE INDEX IF NOT EXISTS idx_candidates_blacklisted ON candidates(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at ON jobs(published_at);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_recruiter ON applications(assigned_recruiter_id);
CREATE INDEX IF NOT EXISTS idx_application_stages_application ON application_stages(application_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_application ON candidate_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_application ON interview_schedules(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_scheduled_at ON interview_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_application ON feedback_forms(application_id);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_interviewer ON feedback_forms(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_hiring_pipelines_job ON hiring_pipelines(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- Enable Row Level Security for new tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- departments
CREATE POLICY "Departments: Authenticated users can read" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Departments: HR/IT admins can manage" ON departments FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- job_categories
CREATE POLICY "Job Categories: Authenticated users can read" ON job_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Job Categories: HR/IT admins can manage" ON job_categories FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- candidates
CREATE POLICY "Candidates: Authenticated users can read" ON candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Candidates: Recruiters/HR/IT admins can manage" ON candidates FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- applications
CREATE POLICY "Applications: Authenticated users can read" ON applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Applications: Recruiters/HR/IT admins can manage" ON applications FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- application_stages
CREATE POLICY "Application Stages: Authenticated users can read" ON application_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Application Stages: Recruiters/HR/IT admins can manage" ON application_stages FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- candidate_documents
CREATE POLICY "Candidate Documents: Authenticated users can read" ON candidate_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Candidate Documents: Recruiters/HR/IT admins can manage" ON candidate_documents FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- interview_schedules
CREATE POLICY "Interview Schedules: Authenticated users can read" ON interview_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Interview Schedules: Recruiters/HR/IT admins can manage" ON interview_schedules FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- feedback_forms
CREATE POLICY "Feedback Forms: Authenticated users can read" ON feedback_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Feedback Forms: Recruiters/HR/IT admins can manage" ON feedback_forms FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- hiring_pipelines
CREATE POLICY "Hiring Pipelines: Authenticated users can read" ON hiring_pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Hiring Pipelines: HR/IT admins can manage" ON hiring_pipelines FOR ALL TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
) WITH CHECK (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- notifications
CREATE POLICY "Notifications: Users can manage their own" ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Notifications: HR/IT admins can read all" ON notifications FOR SELECT TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);

-- audit_logs
CREATE POLICY "Audit Logs: HR/IT admins can read" ON audit_logs FOR SELECT TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);
CREATE POLICY "Audit Logs: System can insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- system_metrics
CREATE POLICY "System Metrics: HR/IT admins can read" ON system_metrics FOR SELECT TO authenticated USING (
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
);
CREATE POLICY "System Metrics: System can insert" ON system_metrics FOR INSERT TO authenticated WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO departments (name, description, headcount_limit, is_active) VALUES 
('Engineering', 'Software development and technical teams', 50, true),
('Human Resources', 'HR operations and talent management', 10, true),
('Sales', 'Sales and business development', 25, true),
('Marketing', 'Marketing and communications', 15, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO job_categories (name, description, is_active) VALUES 
('Software Development', 'Programming and software engineering roles', true),
('Data Science', 'Data analysis and machine learning roles', true),
('Design', 'UI/UX and graphic design roles', true),
('Management', 'Leadership and management positions', true),
('Sales & Marketing', 'Sales and marketing positions', true)
ON CONFLICT (name) DO NOTHING;

-- Update existing jobs to have published status
UPDATE jobs SET status = 'published' WHERE status IS NULL;

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('departments', 'job_categories', 'candidates', 'applications', 'application_stages', 'candidate_documents', 'interview_schedules', 'feedback_forms', 'hiring_pipelines', 'notifications', 'audit_logs', 'system_metrics')
ORDER BY tablename;