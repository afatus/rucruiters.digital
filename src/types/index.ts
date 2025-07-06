export interface Job {
  id: string;
  title: string;
  description: string;
  company: string;
  created_by: string;
  hiring_manager_id: string | null;
  line_manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'recruiter' | 'hiring_manager' | 'line_manager' | 'candidate' | 'hr_operations' | 'it_admin';
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  job_id: string;
  question: string;
  order_index: number;
  created_at: string;
}

export interface Interview {
  id: string;
  job_id: string;
  candidate_email: string;
  candidate_name: string;
  status: string;
  interview_link: string;
  created_at: string;
  completed_at: string | null;
  overall_score: number;
  summary: string | null;
  link_sent_count: number;
}

export interface InterviewLinkLog {
  id: string;
  interview_id: string;
  sent_at: string;
  sent_by: string | null;
  created_at: string;
}

export interface VideoResponse {
  id: string;
  interview_id: string;
  question_id: string;
  video_url: string;
  duration: number;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  response_id: string;
  transcript: string | null;
  sentiment: string | null;
  tone: string | null;
  score: number;
  feedback: string | null;
  has_inappropriate_language: boolean;
  manager_feedback: string | null;
  manager_feedback_by: string | null;
  manager_feedback_at: string | null;
  created_at: string;
}