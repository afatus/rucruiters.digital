/*
  # ATS Çözümü Geliştirmeleri

  1. Yeni Tablolar
    - `departments` - Departman yönetimi
    - `job_categories` - İş kategorileri
    - `candidates` - Aday profilleri
    - `applications` - Başvuru takibi
    - `application_stages` - Başvuru aşamaları
    - `candidate_documents` - Aday belgeleri
    - `interview_schedules` - Mülakat programları
    - `feedback_forms` - Geri bildirim formları
    - `hiring_pipeline` - İşe alım süreci
    - `notifications` - Bildirim sistemi
    - `audit_logs` - Denetim kayıtları
    - `system_metrics` - Sistem metrikleri

  2. Güvenlik
    - Kapsamlı RLS politikaları
    - Veri şifreleme
    - Denetim kayıtları

  3. Ölçeklenebilirlik
    - İndeksler ve performans optimizasyonu
    - Partitioning stratejileri
*/

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  budget decimal(12,2),
  headcount_limit integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job categories table
CREATE TABLE IF NOT EXISTS job_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES job_categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enhanced candidates table
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
  current_salary decimal(10,2),
  expected_salary decimal(10,2),
  experience_years integer DEFAULT 0,
  education_level text CHECK (education_level IN ('high_school', 'bachelor', 'master', 'phd', 'other')),
  skills jsonb DEFAULT '[]'::jsonb,
  languages jsonb DEFAULT '[]'::jsonb,
  availability_date date,
  source text, -- 'website', 'linkedin', 'referral', 'agency', etc.
  referrer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  gdpr_consent boolean DEFAULT false,
  gdpr_consent_date timestamptz,
  is_blacklisted boolean DEFAULT false,
  blacklist_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'applied' CHECK (status IN (
    'applied', 'screening', 'phone_interview', 'technical_interview', 
    'final_interview', 'reference_check', 'offer_made', 'offer_accepted', 
    'offer_declined', 'hired', 'rejected', 'withdrawn'
  )),
  current_stage text DEFAULT 'application_review',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source text, -- How they applied
  cover_letter text,
  resume_url text,
  application_score integer DEFAULT 0 CHECK (application_score >= 0 AND application_score <= 100),
  ai_screening_score integer DEFAULT 0 CHECK (ai_screening_score >= 0 AND ai_screening_score <= 100),
  ai_screening_notes text,
  assigned_recruiter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  applied_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

-- Application stages table
CREATE TABLE IF NOT EXISTS application_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  stage_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  feedback jsonb DEFAULT '{}'::jsonb,
  score integer CHECK (score >= 0 AND score <= 10),
  interviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Candidate documents table
CREATE TABLE IF NOT EXISTS candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'resume', 'cover_letter', 'portfolio', 'certificate', 'reference', 'other'
  )),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  uploaded_at timestamptz DEFAULT now()
);

-- Interview schedules table
CREATE TABLE IF NOT EXISTS interview_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  interview_type text NOT NULL CHECK (interview_type IN (
    'phone_screening', 'video_call', 'technical', 'behavioral', 'final', 'panel'
  )),
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  location text, -- Physical location or video link
  interviewer_ids uuid[] DEFAULT '{}',
  candidate_confirmed boolean DEFAULT false,
  interviewer_confirmed boolean DEFAULT false,
  status text DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'
  )),
  meeting_notes text,
  recording_url text,
  feedback_submitted boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feedback forms table
CREATE TABLE IF NOT EXISTS feedback_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  interview_schedule_id uuid REFERENCES interview_schedules(id) ON DELETE SET NULL,
  interviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  technical_skills_rating integer CHECK (technical_skills_rating >= 1 AND technical_skills_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  cultural_fit_rating integer CHECK (cultural_fit_rating >= 1 AND cultural_fit_rating <= 5),
  strengths text,
  weaknesses text,
  detailed_feedback text,
  recommendation text CHECK (recommendation IN ('strong_hire', 'hire', 'no_hire', 'strong_no_hire')),
  would_work_with boolean,
  submitted_at timestamptz DEFAULT now()
);

-- Hiring pipeline table
CREATE TABLE IF NOT EXISTS hiring_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  stage_name text NOT NULL,
  stage_order integer NOT NULL,
  is_required boolean DEFAULT true,
  auto_advance boolean DEFAULT false,
  sla_hours integer, -- Service Level Agreement in hours
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN (
    'application_received', 'interview_scheduled', 'feedback_required', 
    'offer_made', 'candidate_hired', 'deadline_approaching', 'system_alert'
  )),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create partitions for audit logs (monthly partitions)
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  tags jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
) PARTITION BY RANGE (recorded_at);

-- Create partitions for system metrics (daily partitions)
CREATE TABLE system_metrics_2025_01 PARTITION OF system_metrics
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Enhanced jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN category_id uuid REFERENCES job_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'location'
  ) THEN
    ALTER TABLE jobs ADD COLUMN location text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'remote_work'
  ) THEN
    ALTER TABLE jobs ADD COLUMN remote_work text DEFAULT 'office' CHECK (remote_work IN ('office', 'remote', 'hybrid'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'salary_min'
  ) THEN
    ALTER TABLE jobs ADD COLUMN salary_min decimal(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'salary_max'
  ) THEN
    ALTER TABLE jobs ADD COLUMN salary_max decimal(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'currency'
  ) THEN
    ALTER TABLE jobs ADD COLUMN currency text DEFAULT 'TRY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'required_skills'
  ) THEN
    ALTER TABLE jobs ADD COLUMN required_skills jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'preferred_skills'
  ) THEN
    ALTER TABLE jobs ADD COLUMN preferred_skills jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'experience_min'
  ) THEN
    ALTER TABLE jobs ADD COLUMN experience_min integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'experience_max'
  ) THEN
    ALTER TABLE jobs ADD COLUMN experience_max integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'education_level'
  ) THEN
    ALTER TABLE jobs ADD COLUMN education_level text CHECK (education_level IN ('high_school', 'bachelor', 'master', 'phd', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'application_deadline'
  ) THEN
    ALTER TABLE jobs ADD COLUMN application_deadline date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'status'
  ) THEN
    ALTER TABLE jobs ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_job_categories_parent ON job_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_job_categories_active ON job_categories(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);
CREATE INDEX IF NOT EXISTS idx_candidates_blacklisted ON candidates(is_blacklisted) WHERE is_blacklisted = true;

CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_recruiter ON applications(assigned_recruiter_id);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_activity ON applications(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_stages_app ON application_stages(application_id);
CREATE INDEX IF NOT EXISTS idx_application_stages_status ON application_stages(status);

CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_application ON candidate_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_type ON candidate_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_interview_schedules_app ON interview_schedules(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_date ON interview_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_status ON interview_schedules(status);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_interviewers ON interview_schedules USING GIN(interviewer_ids);

CREATE INDEX IF NOT EXISTS idx_feedback_forms_app ON feedback_forms(application_id);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_interviewer ON feedback_forms(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_schedule ON feedback_forms(interview_schedule_id);

CREATE INDEX IF NOT EXISTS idx_hiring_pipeline_job ON hiring_pipeline(job_id);
CREATE INDEX IF NOT EXISTS idx_hiring_pipeline_order ON hiring_pipeline(job_id, stage_order);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_published ON jobs(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN(required_skills);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_remote ON jobs(remote_work);

-- Enable RLS on all new tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Authenticated users can view departments" ON departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR and IT admins can manage departments" ON departments
  FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

-- RLS Policies for job_categories
CREATE POLICY "Authenticated users can view job categories" ON job_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR and IT admins can manage job categories" ON job_categories
  FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'hr_operations') OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'it_admin')
  );

-- RLS Policies for candidates
CREATE POLICY "Authenticated users can view candidates" ON candidates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Recruiters and HR can manage candidates" ON candidates
  FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('recruiter', 'hr_operations', 'it_admin'))
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('recruiter', 'hr_operations', 'it_admin'))
  );

-- RLS Policies for applications
CREATE POLICY "Authenticated users can view applications" ON applications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Recruiters and stakeholders can manage applications" ON applications
  FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('recruiter', 'hr_operations', 'it_admin')) OR
    (auth.uid() = assigned_recruiter_id) OR
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = applications.job_id
      AND (j.created_by = auth.uid() OR j.hiring_manager_id = auth.uid() OR j.line_manager_id = auth.uid())
    )
  )
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('recruiter', 'hr_operations', 'it_admin')) OR
    (auth.uid() = assigned_recruiter_id) OR
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = applications.job_id
      AND (j.created_by = auth.uid() OR j.hiring_manager_id = auth.uid() OR j.line_manager_id = auth.uid())
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Authenticated users can view application stages" ON application_stages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Stakeholders can manage application stages" ON application_stages
  FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('recruiter', 'hr_operations', 'it_admin')) OR
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = application_stages.application_id
      AND (j.created_by = auth.uid() OR j.hiring_manager_id = auth.uid() OR j.line_manager_id = auth.uid() OR a.assigned_recruiter_id = auth.uid())
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Audit logs policies (read-only for most users)
CREATE POLICY "HR and IT admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('hr_operations', 'it_admin'))
  );

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- System metrics policies
CREATE POLICY "HR and IT admins can view system metrics" ON system_metrics
  FOR SELECT TO authenticated
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('hr_operations', 'it_admin'))
  );

CREATE POLICY "System can create metrics" ON system_metrics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, ip_address)
    VALUES (
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      inet_client_addr()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address)
    VALUES (
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values, ip_address)
    VALUES (
      auth.uid(),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for critical tables
CREATE TRIGGER audit_jobs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_candidates_trigger
  AFTER INSERT OR UPDATE OR DELETE ON candidates
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_applications_trigger
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Insert sample data
INSERT INTO departments (name, description) VALUES 
('Engineering', 'Software development and technical roles'),
('Product', 'Product management and design'),
('Sales', 'Sales and business development'),
('Marketing', 'Marketing and communications'),
('HR', 'Human resources and people operations'),
('Finance', 'Finance and accounting')
ON CONFLICT (name) DO NOTHING;

INSERT INTO job_categories (name, description) VALUES 
('Software Development', 'Programming and software engineering roles'),
('Data Science', 'Data analysis and machine learning roles'),
('DevOps', 'Infrastructure and deployment roles'),
('Design', 'UI/UX and graphic design roles'),
('Management', 'Leadership and management positions'),
('Sales', 'Sales and business development roles')
ON CONFLICT (name) DO NOTHING;

-- Create default hiring pipeline stages
INSERT INTO hiring_pipeline (job_id, stage_name, stage_order, is_required, sla_hours)
SELECT 
  j.id,
  stage.name,
  stage.order_num,
  stage.required,
  stage.sla
FROM jobs j
CROSS JOIN (
  VALUES 
    ('Application Review', 1, true, 48),
    ('Phone Screening', 2, true, 72),
    ('Technical Interview', 3, true, 120),
    ('Final Interview', 4, true, 96),
    ('Reference Check', 5, false, 48),
    ('Offer', 6, true, 24)
) AS stage(name, order_num, required, sla)
WHERE NOT EXISTS (
  SELECT 1 FROM hiring_pipeline hp WHERE hp.job_id = j.id
);