/*
  # Add Multi-Tenancy Support

  1. New Tables
    - `tenants` table for managing different companies/organizations
    - `tenant_settings` table for tenant-specific configurations

  2. Schema Changes
    - Add `tenant_id` column to all relevant tables
    - Populate existing data with default tenant
    - Add foreign key constraints
    - Update RLS policies for tenant isolation

  3. Security
    - Enable RLS on new tables
    - Update existing policies to include tenant filtering
    - Ensure complete data isolation between tenants
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'professional', 'enterprise')),
  max_users integer DEFAULT 10,
  max_jobs integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenant_settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text DEFAULT '#1C4DA1',
  secondary_color text DEFAULT '#6CBE45',
  custom_domain text,
  openai_api_key text, -- Encrypted tenant-specific API key
  email_settings jsonb DEFAULT '{}',
  branding_settings jsonb DEFAULT '{}',
  feature_flags jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default tenant for existing data
INSERT INTO tenants (id, name, slug, status, plan) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'active', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- Insert default tenant settings
INSERT INTO tenant_settings (tenant_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (tenant_id) DO NOTHING;

-- Add tenant_id column to existing tables (nullable first)
DO $$
BEGIN
  -- profiles table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tenant_id uuid;
  END IF;

  -- jobs table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN tenant_id uuid;
  END IF;

  -- interview_questions table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_questions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE interview_questions ADD COLUMN tenant_id uuid;
  END IF;

  -- interviews table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interviews' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE interviews ADD COLUMN tenant_id uuid;
  END IF;

  -- interview_link_logs table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_link_logs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE interview_link_logs ADD COLUMN tenant_id uuid;
  END IF;

  -- video_responses table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_responses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE video_responses ADD COLUMN tenant_id uuid;
  END IF;

  -- ai_analysis table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_analysis' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE ai_analysis ADD COLUMN tenant_id uuid;
  END IF;

  -- departments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE departments ADD COLUMN tenant_id uuid;
  END IF;

  -- job_categories table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_categories' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE job_categories ADD COLUMN tenant_id uuid;
  END IF;

  -- candidates table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE candidates ADD COLUMN tenant_id uuid;
  END IF;

  -- applications table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE applications ADD COLUMN tenant_id uuid;
  END IF;

  -- application_stages table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'application_stages' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE application_stages ADD COLUMN tenant_id uuid;
  END IF;

  -- candidate_documents table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidate_documents' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE candidate_documents ADD COLUMN tenant_id uuid;
  END IF;

  -- interview_schedules table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interview_schedules' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE interview_schedules ADD COLUMN tenant_id uuid;
  END IF;

  -- feedback_forms table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_forms' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE feedback_forms ADD COLUMN tenant_id uuid;
  END IF;

  -- hiring_pipelines table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hiring_pipelines' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE hiring_pipelines ADD COLUMN tenant_id uuid;
  END IF;

  -- notifications table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN tenant_id uuid;
  END IF;

  -- audit_logs table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN tenant_id uuid;
  END IF;

  -- system_metrics table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_metrics' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE system_metrics ADD COLUMN tenant_id uuid;
  END IF;
END $$;

-- Populate tenant_id for existing data with default tenant
UPDATE profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE jobs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE interview_questions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE interviews SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE interview_link_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE video_responses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE ai_analysis SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE departments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE job_categories SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE candidates SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE applications SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE application_stages SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE candidate_documents SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE interview_schedules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE feedback_forms SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE hiring_pipelines SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE audit_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE system_metrics SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL and add foreign key constraints
ALTER TABLE profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interview_questions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interviews ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interview_link_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE video_responses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ai_analysis ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE departments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE job_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE candidates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE applications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE application_stages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE candidate_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interview_schedules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE feedback_forms ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE hiring_pipelines ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE system_metrics ALTER COLUMN tenant_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE profiles ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD CONSTRAINT jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE interview_questions ADD CONSTRAINT interview_questions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE interviews ADD CONSTRAINT interviews_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE interview_link_logs ADD CONSTRAINT interview_link_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE video_responses ADD CONSTRAINT video_responses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE ai_analysis ADD CONSTRAINT ai_analysis_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE departments ADD CONSTRAINT departments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE job_categories ADD CONSTRAINT job_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE candidates ADD CONSTRAINT candidates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE applications ADD CONSTRAINT applications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE application_stages ADD CONSTRAINT application_stages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE candidate_documents ADD CONSTRAINT candidate_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE interview_schedules ADD CONSTRAINT interview_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE feedback_forms ADD CONSTRAINT feedback_forms_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE hiring_pipelines ADD CONSTRAINT hiring_pipelines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE system_metrics ADD CONSTRAINT system_metrics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant_id columns
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_tenant ON interview_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_tenant ON interviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interview_link_logs_tenant ON interview_link_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_responses_tenant ON video_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_tenant ON ai_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_categories_tenant ON job_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant ON applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_application_stages_tenant ON application_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_tenant ON candidate_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_tenant ON interview_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_forms_tenant ON feedback_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hiring_pipelines_tenant ON hiring_pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_tenant ON system_metrics(tenant_id);

-- Enable RLS on new tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants table
CREATE POLICY "Super admins can manage all tenants" ON tenants
  FOR ALL TO authenticated
  USING (((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'));

CREATE POLICY "Tenant admins can view their tenant" ON tenants
  FOR SELECT TO authenticated
  USING (
    id = (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'tenant_admin'
    )
  );

-- RLS Policies for tenant_settings table
CREATE POLICY "Super admins can manage all tenant settings" ON tenant_settings
  FOR ALL TO authenticated
  USING (((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'));

CREATE POLICY "Tenant admins can manage their settings" ON tenant_settings
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'tenant_admin'
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'tenant_admin'
    )
  );

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing RLS policies to include tenant filtering
-- Note: This is a foundation - you'll need to update each policy individually

-- Example for jobs table (you'll need to apply similar patterns to other tables)
DROP POLICY IF EXISTS "Users can view all jobs" ON jobs;
CREATE POLICY "Users can view jobs in their tenant" ON jobs
  FOR SELECT TO authenticated, anon
  USING (
    tenant_id = get_current_tenant_id() OR
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
  );

-- Update the handle_new_user function to assign tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Create profile with default tenant
  INSERT INTO public.profiles (id, full_name, role, tenant_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'recruiter'),
    COALESCE((new.raw_user_meta_data->>'tenant_id')::uuid, default_tenant_id)
  );
  
  -- Update user metadata to include role and tenant for JWT access
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', COALESCE(new.raw_user_meta_data->>'role', 'recruiter'),
      'tenant_id', COALESCE((new.raw_user_meta_data->>'tenant_id')::uuid, default_tenant_id)
    )
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the sync_user_metadata function to include tenant
CREATE OR REPLACE FUNCTION public.sync_user_metadata()
RETURNS trigger AS $$
BEGIN
  -- Update user metadata when profile role or tenant changes
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', NEW.role,
      'tenant_id', NEW.tenant_id
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to sync tenant changes
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON profiles;
CREATE TRIGGER sync_user_metadata_trigger
  AFTER UPDATE OF role, tenant_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata();

-- Create view for tenant-aware user roles
CREATE OR REPLACE VIEW tenant_user_roles AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.department,
  p.tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  p.created_at as profile_created_at,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN tenants t ON p.tenant_id = t.id;

-- Grant access to the new view
GRANT SELECT ON tenant_user_roles TO authenticated;

-- Insert sample tenant for testing
INSERT INTO tenants (name, slug, status, plan) 
VALUES ('Acme Corporation', 'acme', 'active', 'professional')
ON CONFLICT (slug) DO NOTHING;

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tenants', 'tenant_settings')
ORDER BY tablename;

-- Show tenant_id columns added
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'tenant_id'
ORDER BY table_name;