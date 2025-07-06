/*
  # Add inappropriate language detection column

  1. New Column
    - `has_inappropriate_language` (boolean, default false) in ai_analysis table
  
  2. Purpose
    - Track when AI detects inappropriate language in candidate responses
    - Enable warning display in HR dashboard
*/

-- Add has_inappropriate_language column to ai_analysis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_analysis' AND column_name = 'has_inappropriate_language'
  ) THEN
    ALTER TABLE ai_analysis ADD COLUMN has_inappropriate_language boolean DEFAULT false;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_inappropriate_language 
ON ai_analysis(has_inappropriate_language) 
WHERE has_inappropriate_language = true;