export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  budget?: number;
  headcount_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface JobCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string;
}

export interface Candidate {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  current_location?: string;
  preferred_location?: string;
  current_salary?: number;
  expected_salary?: number;
  experience_years: number;
  education_level?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other';
  skills: string[];
  languages: Array<{language: string; level: string}>;
  availability_date?: string;
  source?: string;
  referrer_id?: string;
  gdpr_consent: boolean;
  gdpr_consent_date?: string;
  is_blacklisted: boolean;
  blacklist_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  status: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 
          'final_interview' | 'reference_check' | 'offer_made' | 'offer_accepted' | 
          'offer_declined' | 'hired' | 'rejected' | 'withdrawn';
  current_stage: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  cover_letter?: string;
  resume_url?: string;
  application_score: number;
  ai_screening_score: number;
  ai_screening_notes?: string;
  assigned_recruiter_id?: string;
  applied_at: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  // Relations
  job?: Job;
  candidate?: Candidate;
  assigned_recruiter?: Profile;
  tenant_id: string;
}

export interface ApplicationStage {
  id: string;
  application_id: string;
  stage_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  started_at?: string;
  completed_at?: string;
  notes?: string;
  feedback: Record<string, any>;
  score?: number;
  interviewer_id?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface CandidateDocument {
  id: string;
  candidate_id: string;
  application_id?: string;
  document_type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'reference' | 'other';
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  uploaded_at: string;
  tenant_id: string;
}

export interface InterviewSchedule {
  id: string;
  application_id: string;
  interview_type: 'phone_screening' | 'video_call' | 'technical' | 'behavioral' | 'final' | 'panel';
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  interviewer_ids: string[];
  candidate_confirmed: boolean;
  interviewer_confirmed: boolean;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  meeting_notes?: string;
  recording_url?: string;
  feedback_submitted: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export interface FeedbackForm {
  id: string;
  application_id: string;
  interview_schedule_id?: string;
  interviewer_id: string;
  overall_rating?: number;
  technical_skills_rating?: number;
  communication_rating?: number;
  cultural_fit_rating?: number;
  strengths?: string;
  weaknesses?: string;
  detailed_feedback?: string;
  recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  would_work_with?: boolean;
  submitted_at: string;
  tenant_id: string;
}

export interface HiringPipeline {
  id: string;
  job_id: string;
  stage_name: string;
  stage_order: number;
  is_required: boolean;
  auto_advance: boolean;
  sla_hours?: number;
  created_at: string;
  tenant_id: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'application_received' | 'interview_scheduled' | 'feedback_required' | 
        'offer_made' | 'candidate_hired' | 'deadline_approaching' | 'system_alert';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: string;
  created_at: string;
  tenant_id: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
  tenant_id: string;
}

export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  tags: Record<string, any>;
  recorded_at: string;
  tenant_id: string;
}

// Enhanced Job interface
export interface EnhancedJob extends Job {
  department_id?: string;
  category_id?: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
  location?: string;
  remote_work: 'office' | 'remote' | 'hybrid';
  salary_min?: number;
  salary_max?: number;
  currency: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_min: number;
  experience_max?: number;
  education_level?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other';
  application_deadline?: string;
  status: 'draft' | 'published' | 'paused' | 'closed' | 'cancelled';
  published_at?: string;
  // Relations
  department?: Department;
  category?: JobCategory;
  tenant_id: string;
}

// Dashboard Analytics
export interface ATSAnalytics {
  totalApplications: number;
  activeJobs: number;
  candidatesInPipeline: number;
  averageTimeToHire: number;
  conversionRates: {
    applicationToInterview: number;
    interviewToOffer: number;
    offerToHire: number;
  };
  topSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  departmentMetrics: Array<{
    department: string;
    openPositions: number;
    applications: number;
    hires: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    applications: number;
    hires: number;
    rejections: number;
  }>;
}

// Search and Filter interfaces
export interface CandidateSearchFilters {
  skills?: string[];
  experience_min?: number;
  experience_max?: number;
  location?: string;
  education_level?: string[];
  availability_date?: string;
  source?: string[];
  salary_min?: number;
  salary_max?: number;
}

export interface ApplicationFilters {
  status?: string[];
  priority?: string[];
  assigned_recruiter?: string;
  job_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  source?: string[];
  score_min?: number;
}