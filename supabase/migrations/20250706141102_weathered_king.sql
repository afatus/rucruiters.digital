-- Create profiles table for user roles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'recruiter' CHECK (role IN ('recruiter', 'hiring_manager', 'line_manager', 'candidate', 'hr_operations', 'it_admin')),
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add role-related columns to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'hiring_manager_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN hiring_manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'line_manager_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN line_manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add manager feedback to ai_analysis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_analysis' AND column_name = 'manager_feedback'
  ) THEN
    ALTER TABLE ai_analysis ADD COLUMN manager_feedback text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_analysis' AND column_name = 'manager_feedback_by'
  ) THEN
    ALTER TABLE ai_analysis ADD COLUMN manager_feedback_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_analysis' AND column_name = 'manager_feedback_at'
  ) THEN
    ALTER TABLE ai_analysis ADD COLUMN manager_feedback_at timestamptz;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_jobs_hiring_manager ON jobs(hiring_manager_id);
CREATE INDEX IF NOT EXISTS idx_jobs_line_manager ON jobs(line_manager_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_manager_feedback_by ON ai_analysis(manager_feedback_by);

-- Enable Row Level Security on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profiles policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "HR and IT admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "HR and IT admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view profiles in their department" ON profiles;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "HR and IT admins can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr_operations', 'it_admin')
    )
  );

CREATE POLICY "HR and IT admins can manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr_operations', 'it_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr_operations', 'it_admin')
    )
  );

CREATE POLICY "Managers can view profiles in their department" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      WHERE p1.id = auth.uid() 
      AND p1.role IN ('hiring_manager', 'line_manager')
      AND p1.department = profiles.department
    )
  );

-- Update jobs policies for role-based access
DROP POLICY IF EXISTS "Users can create their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS "Recruiters and HR can create jobs" ON jobs;
DROP POLICY IF EXISTS "Job creators and managers can update jobs" ON jobs;
DROP POLICY IF EXISTS "Job creators and HR can delete jobs" ON jobs;

CREATE POLICY "Recruiters and HR can create jobs" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('recruiter', 'hr_operations')
    )
  );

CREATE POLICY "Job creators and managers can update jobs" ON jobs
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() = hiring_manager_id OR
    auth.uid() = line_manager_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr_operations', 'it_admin')
    )
  )
  WITH CHECK (
    auth.uid() = created_by OR
    auth.uid() = hiring_manager_id OR
    auth.uid() = line_manager_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr_operations', 'it_admin')
    )
  );

CREATE POLICY "Job creators and HR can delete jobs" ON jobs
  FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr_operations', 'it_admin')
    )
  );

-- Update interview questions policies for role-based access
DROP POLICY IF EXISTS "Job owners can manage questions" ON interview_questions;
DROP POLICY IF EXISTS "Job stakeholders can manage questions" ON interview_questions;

CREATE POLICY "Job stakeholders can manage questions" ON interview_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interview_questions.job_id 
      AND (
        jobs.created_by = auth.uid() OR
        jobs.hiring_manager_id = auth.uid() OR
        jobs.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interview_questions.job_id 
      AND (
        jobs.created_by = auth.uid() OR
        jobs.hiring_manager_id = auth.uid() OR
        jobs.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  );

-- Update interviews policies for role-based access
DROP POLICY IF EXISTS "Job owners can manage interviews" ON interviews;
DROP POLICY IF EXISTS "Job stakeholders can manage interviews" ON interviews;

CREATE POLICY "Job stakeholders can manage interviews" ON interviews
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interviews.job_id 
      AND (
        jobs.created_by = auth.uid() OR
        jobs.hiring_manager_id = auth.uid() OR
        jobs.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interviews.job_id 
      AND (
        jobs.created_by = auth.uid() OR
        jobs.hiring_manager_id = auth.uid() OR
        jobs.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  );

-- Update video responses policies for role-based access
DROP POLICY IF EXISTS "Job owners can manage video responses" ON video_responses;
DROP POLICY IF EXISTS "Job stakeholders can manage video responses" ON video_responses;

CREATE POLICY "Job stakeholders can manage video responses" ON video_responses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = video_responses.interview_id
      AND (
        j.created_by = auth.uid() OR
        j.hiring_manager_id = auth.uid() OR
        j.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  );

-- Update AI analysis policies for role-based access
DROP POLICY IF EXISTS "Job owners can manage AI analysis" ON ai_analysis;
DROP POLICY IF EXISTS "Job stakeholders can manage AI analysis" ON ai_analysis;

CREATE POLICY "Job stakeholders can manage AI analysis" ON ai_analysis
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM video_responses vr
      JOIN interviews i ON vr.interview_id = i.id
      JOIN jobs j ON i.job_id = j.id
      WHERE vr.id = ai_analysis.response_id
      AND (
        j.created_by = auth.uid() OR
        j.hiring_manager_id = auth.uid() OR
        j.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  );

-- Update interview link logs policies for role-based access
DROP POLICY IF EXISTS "Job owners can manage link logs" ON interview_link_logs;
DROP POLICY IF EXISTS "Job stakeholders can manage link logs" ON interview_link_logs;

CREATE POLICY "Job stakeholders can manage link logs" ON interview_link_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = interview_link_logs.interview_id
      AND (
        j.created_by = auth.uid() OR
        j.hiring_manager_id = auth.uid() OR
        j.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = interview_link_logs.interview_id
      AND (
        j.created_by = auth.uid() OR
        j.hiring_manager_id = auth.uid() OR
        j.line_manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('hr_operations', 'it_admin')
        )
      )
    )
  );

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'recruiter')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create some sample profiles for existing users (if any)
INSERT INTO profiles (id, full_name, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
  'recruiter' as role
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- Create view for easy role-based queries
CREATE OR REPLACE VIEW user_roles AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.department,
  p.created_at as profile_created_at,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;

-- Grant access to the view
GRANT SELECT ON user_roles TO authenticated;