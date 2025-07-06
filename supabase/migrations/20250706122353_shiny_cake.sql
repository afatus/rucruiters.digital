/*
  # Interview Link Tracking System

  1. New Columns
    - `link_sent_count` (integer, default 1) in interviews table
    - Track how many times the interview link has been sent

  2. New Table
    - `interview_link_logs` table to log each link sending event
    - Columns: id, interview_id, sent_at, sent_by
    - Track detailed history of link sending

  3. Security
    - Enable RLS on new table
    - Add appropriate policies for authenticated users
*/

-- Add link_sent_count column to interviews table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interviews' AND column_name = 'link_sent_count'
  ) THEN
    ALTER TABLE interviews ADD COLUMN link_sent_count integer DEFAULT 1;
  END IF;
END $$;

-- Create interview_link_logs table
CREATE TABLE IF NOT EXISTS interview_link_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  sent_at timestamptz DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_link_logs_interview_id ON interview_link_logs(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_link_logs_sent_at ON interview_link_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_link_logs_sent_by ON interview_link_logs(sent_by);

-- Enable Row Level Security
ALTER TABLE interview_link_logs ENABLE ROW LEVEL SECURITY;

-- Interview link logs policies
CREATE POLICY "Anyone can view interview link logs" ON interview_link_logs
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create link logs" ON interview_link_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Job owners can manage link logs" ON interview_link_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = interview_link_logs.interview_id
      AND j.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      WHERE i.id = interview_link_logs.interview_id
      AND j.created_by = auth.uid()
    )
  );

-- Update existing interviews to have link_sent_count = 1 if null
UPDATE interviews 
SET link_sent_count = 1 
WHERE link_sent_count IS NULL;

-- Create initial log entries for existing interviews
INSERT INTO interview_link_logs (interview_id, sent_at, sent_by)
SELECT 
  id,
  created_at,
  (SELECT id FROM auth.users LIMIT 1) -- Use first user as fallback, or NULL if no users
FROM interviews
WHERE NOT EXISTS (
  SELECT 1 FROM interview_link_logs 
  WHERE interview_link_logs.interview_id = interviews.id
);

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'interview_link_logs'
ORDER BY tablename;

-- Show the new column
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'interviews' 
AND column_name = 'link_sent_count';