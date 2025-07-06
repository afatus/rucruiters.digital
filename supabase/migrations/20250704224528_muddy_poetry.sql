/*
  # Complete AI HR Interview Platform Database Setup
  
  This script sets up the complete database schema for the AI HR Interview Platform.
  Run this in your Supabase project's SQL Editor to create all necessary tables,
  relationships, and security policies.
  
  ## Tables Created:
  1. jobs - Job postings with descriptions
  2. interview_questions - AI-generated questions for each job
  3. interviews - Individual interview sessions
  4. video_responses - Candidate video responses to questions
  5. ai_analysis - AI analysis results for each response
  
  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Appropriate policies for authenticated and anonymous users
  - Storage bucket for interview videos
*/

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS ai_analysis CASCADE;
DROP TABLE IF EXISTS video_responses CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS interview_questions CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- Create jobs table
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  company text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interview_questions table
CREATE TABLE interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create interviews table
CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_email text NOT NULL,
  candidate_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  interview_link text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  overall_score integer DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 10),
  summary text
);

-- Create video_responses table
CREATE TABLE video_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES interview_questions(id) ON DELETE CASCADE NOT NULL,
  video_url text NOT NULL,
  duration integer DEFAULT 0 CHECK (duration >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create ai_analysis table
CREATE TABLE ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES video_responses(id) ON DELETE CASCADE NOT NULL,
  transcript text,
  sentiment text,
  tone text,
  score integer DEFAULT 0 CHECK (score >= 0 AND score <= 10),
  feedback text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_interview_questions_job_id ON interview_questions(job_id);
CREATE INDEX idx_interview_questions_order ON interview_questions(job_id, order_index);
CREATE INDEX idx_interviews_job_id ON interviews(job_id);
CREATE INDEX idx_interviews_link ON interviews(interview_link);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_video_responses_interview_id ON video_responses(interview_id);
CREATE INDEX idx_video_responses_question_id ON video_responses(question_id);
CREATE INDEX idx_ai_analysis_response_id ON ai_analysis(response_id);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Users can view all jobs" ON jobs
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create their own jobs" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own jobs" ON jobs
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Interview questions policies
CREATE POLICY "Anyone can view interview questions" ON interview_questions
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Job owners can manage questions" ON interview_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interview_questions.job_id 
      AND jobs.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interview_questions.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Interviews policies
CREATE POLICY "Anyone can view interviews by link" ON interviews
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Job owners can manage interviews" ON interviews
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interviews.job_id 
      AND jobs.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = interviews.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can create interviews" ON interviews
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update interview status" ON interviews
  FOR UPDATE TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Video responses policies
CREATE POLICY "Anyone can view video responses" ON video_responses
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can create video responses" ON video_responses
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Job owners can manage video responses" ON video_responses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = video_responses.interview_id
      AND j.created_by = auth.uid()
    )
  );

-- AI analysis policies
CREATE POLICY "Anyone can view AI analysis" ON ai_analysis
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can create AI analysis" ON ai_analysis
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Job owners can manage AI analysis" ON ai_analysis
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM video_responses vr
      JOIN interviews i ON vr.interview_id = i.id
      JOIN jobs j ON i.job_id = j.id
      WHERE vr.id = ai_analysis.response_id
      AND j.created_by = auth.uid()
    )
  );

-- Create storage bucket for interview videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-videos', 'interview-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for interview videos
CREATE POLICY "Anyone can upload interview videos" ON storage.objects
  FOR INSERT TO authenticated, anon
  WITH CHECK (bucket_id = 'interview-videos');

CREATE POLICY "Anyone can view interview videos" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'interview-videos');

CREATE POLICY "Anyone can update interview videos" ON storage.objects
  FOR UPDATE TO authenticated, anon
  USING (bucket_id = 'interview-videos')
  WITH CHECK (bucket_id = 'interview-videos');

-- Add some sample data for testing (optional)
-- You can remove this section if you don't want sample data

-- Sample job (only if you want test data)
/*
INSERT INTO jobs (title, company, description, created_by) VALUES 
(
  'Senior Frontend Developer',
  'TechCorp Inc.',
  'We are looking for a Senior Frontend Developer to join our team. You will be responsible for developing user interfaces using React, TypeScript, and modern web technologies. The ideal candidate has 5+ years of experience in frontend development and a strong understanding of web performance optimization.',
  (SELECT id FROM auth.users LIMIT 1)
);
*/

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('jobs', 'interview_questions', 'interviews', 'video_responses', 'ai_analysis')
ORDER BY tablename;

-- Show foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('jobs', 'interview_questions', 'interviews', 'video_responses', 'ai_analysis')
ORDER BY tc.table_name, kcu.column_name;