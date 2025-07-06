import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are properly configured
if (!supabaseUrl || supabaseUrl === 'your_supabase_url') {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please set it in your .env file.');
}

if (!supabaseKey || supabaseKey === 'your_supabase_anon_key') {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please set it in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          title: string;
          description: string;
          company: string;
          created_by: string;
          hiring_manager_id: string | null;
          line_manager_id: string | null;
          created_at: string;
          updated_at: string;
          // New ATS columns
          department_id: string | null;
          category_id: string | null;
          employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | null;
          location: string | null;
          remote_work: 'office' | 'remote' | 'hybrid' | null;
          salary_min: number | null;
          salary_max: number | null;
          currency: string | null;
          required_skills: string[] | null;
          preferred_skills: string[] | null;
          experience_min: number | null;
          experience_max: number | null;
          education_level: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other' | null;
          application_deadline: string | null;
          status: 'draft' | 'published' | 'paused' | 'closed' | 'cancelled' | null;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          company: string;
          created_by: string;
          hiring_manager_id?: string | null;
          line_manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
          // New ATS columns
          department_id?: string | null;
          category_id?: string | null;
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | null;
          location?: string | null;
          remote_work?: 'office' | 'remote' | 'hybrid' | null;
          salary_min?: number | null;
          salary_max?: number | null;
          currency?: string | null;
          required_skills?: string[] | null;
          preferred_skills?: string[] | null;
          experience_min?: number | null;
          experience_max?: number | null;
          education_level?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other' | null;
          application_deadline?: string | null;
          status?: 'draft' | 'published' | 'paused' | 'closed' | 'cancelled' | null;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          company?: string;
          created_by?: string;
          hiring_manager_id?: string | null;
          line_manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
          // New ATS columns
          department_id?: string | null;
          category_id?: string | null;
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | null;
          location?: string | null;
          remote_work?: 'office' | 'remote' | 'hybrid' | null;
          salary_min?: number | null;
          salary_max?: number | null;
          currency?: string | null;
          required_skills?: string[] | null;
          preferred_skills?: string[] | null;
          experience_min?: number | null;
          experience_max?: number | null;
          education_level?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other' | null;
          application_deadline?: string | null;
          status?: 'draft' | 'published' | 'paused' | 'closed' | 'cancelled' | null;
          published_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: string;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: string;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: string;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      interview_questions: {
        Row: {
          id: string;
          job_id: string;
          question: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          question: string;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          question?: string;
          order_index?: number;
          created_at?: string;
        };
      };
      interviews: {
        Row: {
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
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_email: string;
          candidate_name: string;
          status?: string;
          interview_link: string;
          created_at?: string;
          completed_at?: string | null;
          overall_score?: number;
          summary?: string | null;
          link_sent_count?: number;
        };
        Update: {
          id?: string;
          job_id?: string;
          candidate_email?: string;
          candidate_name?: string;
          status?: string;
          interview_link?: string;
          created_at?: string;
          completed_at?: string | null;
          overall_score?: number;
          summary?: string | null;
          link_sent_count?: number;
        };
      };
      interview_link_logs: {
        Row: {
          id: string;
          interview_id: string;
          sent_at: string;
          sent_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          sent_at?: string;
          sent_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          sent_at?: string;
          sent_by?: string | null;
          created_at?: string;
        };
      };
      video_responses: {
        Row: {
          id: string;
          interview_id: string;
          question_id: string;
          video_url: string;
          duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          question_id: string;
          video_url: string;
          duration?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          question_id?: string;
          video_url?: string;
          duration?: number;
          created_at?: string;
        };
      };
      ai_analysis: {
        Row: {
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
        };
        Insert: {
          id?: string;
          response_id: string;
          transcript?: string | null;
          sentiment?: string | null;
          tone?: string | null;
          score?: number;
          feedback?: string | null;
          has_inappropriate_language?: boolean;
          manager_feedback?: string | null;
          manager_feedback_by?: string | null;
          manager_feedback_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          transcript?: string | null;
          sentiment?: string | null;
          tone?: string | null;
          score?: number;
          feedback?: string | null;
          has_inappropriate_language?: boolean;
          manager_feedback?: string | null;
          manager_feedback_by?: string | null;
          manager_feedback_at?: string | null;
          created_at?: string;
        };
      };
      // ATS Tables
      departments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          manager_id: string | null;
          budget: number | null;
          headcount_limit: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          manager_id?: string | null;
          budget?: number | null;
          headcount_limit: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          manager_id?: string | null;
          budget?: number | null;
          headcount_limit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          parent_category_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          parent_category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          parent_category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      candidates: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          current_location: string | null;
          preferred_location: string | null;
          current_salary: number | null;
          expected_salary: number | null;
          experience_years: number;
          education_level: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other' | null;
          skills: string[] | null;
          languages: Json | null;
          availability_date: string | null;
          source: string | null;
          referrer_id: string | null;
          gdpr_consent: boolean;
          gdpr_consent_date: string | null;
          is_blacklisted: boolean;
          blacklist_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          current_location?: string | null;
          preferred_location?: string | null;
          current_salary?: number | null;
          expected_salary?: number | null;
          experience_years: number;
          education_level?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other' | null;
          skills?: string[] | null;
          languages?: Json | null;
          availability_date?: string | null;
          source?: string | null;
          referrer_id?: string | null;
          gdpr_consent: boolean;
          gdpr_consent_date?: string | null;
          is_blacklisted?: boolean;
          blacklist_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          current_location?: string | null;
          preferred_location?: string | null;
          current_salary?: number | null;
          expected_salary?: number | null;
          experience_years?: number;
          education_level?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other' | null;
          skills?: string[] | null;
          languages?: Json | null;
          availability_date?: string | null;
          source?: string | null;
          referrer_id?: string | null;
          gdpr_consent?: boolean;
          gdpr_consent_date?: string | null;
          is_blacklisted?: boolean;
          blacklist_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          candidate_id: string;
          status: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 'final_interview' | 'reference_check' | 'offer_made' | 'offer_accepted' | 'offer_declined' | 'hired' | 'rejected' | 'withdrawn';
          current_stage: string;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          source: string | null;
          cover_letter: string | null;
          resume_url: string | null;
          application_score: number | null;
          ai_screening_score: number | null;
          ai_screening_notes: string | null;
          assigned_recruiter_id: string | null;
          applied_at: string;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          candidate_id: string;
          status: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 'final_interview' | 'reference_check' | 'offer_made' | 'offer_accepted' | 'offer_declined' | 'hired' | 'rejected' | 'withdrawn';
          current_stage: string;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          source?: string | null;
          cover_letter?: string | null;
          resume_url?: string | null;
          application_score?: number | null;
          ai_screening_score?: number | null;
          ai_screening_notes?: string | null;
          assigned_recruiter_id?: string | null;
          applied_at?: string;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          candidate_id?: string;
          status?: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 'final_interview' | 'reference_check' | 'offer_made' | 'offer_accepted' | 'offer_declined' | 'hired' | 'rejected' | 'withdrawn';
          current_stage?: string;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          source?: string | null;
          cover_letter?: string | null;
          resume_url?: string | null;
          application_score?: number | null;
          ai_screening_score?: number | null;
          ai_screening_notes?: string | null;
          assigned_recruiter_id?: string | null;
          applied_at?: string;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      application_stages: {
        Row: {
          id: string;
          application_id: string;
          stage_name: string;
          status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
          started_at: string | null;
          completed_at: string | null;
          notes: string | null;
          feedback: Json | null;
          score: number | null;
          interviewer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          stage_name: string;
          status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          feedback?: Json | null;
          score?: number | null;
          interviewer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          stage_name?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          feedback?: Json | null;
          score?: number | null;
          interviewer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      candidate_documents: {
        Row: {
          id: string;
          candidate_id: string;
          application_id: string | null;
          document_type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'reference' | 'other';
          file_name: string;
          file_url: string;
          file_size: number | null;
          mime_type: string | null;
          is_verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          application_id?: string | null;
          document_type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'reference' | 'other';
          file_name: string;
          file_url: string;
          file_size?: number | null;
          mime_type?: string | null;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          application_id?: string | null;
          document_type?: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'reference' | 'other';
          file_name?: string;
          file_url?: string;
          file_size?: number | null;
          mime_type?: string | null;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          uploaded_at?: string;
        };
      };
      interview_schedules: {
        Row: {
          id: string;
          application_id: string;
          interview_type: 'phone_screening' | 'video_call' | 'technical' | 'behavioral' | 'final' | 'panel';
          scheduled_at: string;
          duration_minutes: number;
          location: string | null;
          interviewer_ids: string[] | null;
          candidate_confirmed: boolean;
          interviewer_confirmed: boolean;
          status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
          meeting_notes: string | null;
          recording_url: string | null;
          feedback_submitted: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          interview_type: 'phone_screening' | 'video_call' | 'technical' | 'behavioral' | 'final' | 'panel';
          scheduled_at: string;
          duration_minutes: number;
          location?: string | null;
          interviewer_ids?: string[] | null;
          candidate_confirmed?: boolean;
          interviewer_confirmed?: boolean;
          status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
          meeting_notes?: string | null;
          recording_url?: string | null;
          feedback_submitted?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          interview_type?: 'phone_screening' | 'video_call' | 'technical' | 'behavioral' | 'final' | 'panel';
          scheduled_at?: string;
          duration_minutes?: number;
          location?: string | null;
          interviewer_ids?: string[] | null;
          candidate_confirmed?: boolean;
          interviewer_confirmed?: boolean;
          status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
          meeting_notes?: string | null;
          recording_url?: string | null;
          feedback_submitted?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      feedback_forms: {
        Row: {
          id: string;
          application_id: string;
          interview_schedule_id: string | null;
          interviewer_id: string | null;
          overall_rating: number | null;
          technical_skills_rating: number | null;
          communication_rating: number | null;
          cultural_fit_rating: number | null;
          strengths: string | null;
          weaknesses: string | null;
          detailed_feedback: string | null;
          recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | null;
          would_work_with: boolean | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          interview_schedule_id?: string | null;
          interviewer_id?: string | null;
          overall_rating?: number | null;
          technical_skills_rating?: number | null;
          communication_rating?: number | null;
          cultural_fit_rating?: number | null;
          strengths?: string | null;
          weaknesses?: string | null;
          detailed_feedback?: string | null;
          recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | null;
          would_work_with?: boolean | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          interview_schedule_id?: string | null;
          interviewer_id?: string | null;
          overall_rating?: number | null;
          technical_skills_rating?: number | null;
          communication_rating?: number | null;
          cultural_fit_rating?: number | null;
          strengths?: string | null;
          weaknesses?: string | null;
          detailed_feedback?: string | null;
          recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | null;
          would_work_with?: boolean | null;
          submitted_at?: string;
        };
      };
      hiring_pipelines: {
        Row: {
          id: string;
          job_id: string;
          stage_name: string;
          stage_order: number;
          is_required: boolean;
          auto_advance: boolean;
          sla_hours: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          stage_name: string;
          stage_order: number;
          is_required?: boolean;
          auto_advance?: boolean;
          sla_hours?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          stage_name?: string;
          stage_order?: number;
          is_required?: boolean;
          auto_advance?: boolean;
          sla_hours?: number | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'application_received' | 'interview_scheduled' | 'feedback_required' | 'offer_made' | 'candidate_hired' | 'deadline_approaching' | 'system_alert';
          title: string;
          message: string;
          data: Json | null;
          is_read: boolean;
          priority: 'low' | 'normal' | 'high' | 'urgent';
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'application_received' | 'interview_scheduled' | 'feedback_required' | 'offer_made' | 'candidate_hired' | 'deadline_approaching' | 'system_alert';
          title: string;
          message: string;
          data?: Json | null;
          is_read?: boolean;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'application_received' | 'interview_scheduled' | 'feedback_required' | 'offer_made' | 'candidate_hired' | 'deadline_approaching' | 'system_alert';
          title?: string;
          message?: string;
          data?: Json | null;
          is_read?: boolean;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          expires_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
      };
      system_metrics: {
        Row: {
          id: string;
          metric_name: string;
          metric_value: number;
          metric_unit: string | null;
          tags: Json | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          metric_name: string;
          metric_value: number;
          metric_unit?: string | null;
          tags?: Json | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          metric_name?: string;
          metric_value?: number;
          metric_unit?: string | null;
          tags?: Json | null;
          recorded_at?: string;
        };
      };
    };
    Views: {
      user_roles: {
        Row: {
          id: string | null;
          email: string | null;
          full_name: string | null;
          role: string | null;
          department: string | null;
          profile_created_at: string | null;
          user_created_at: string | null;
        };
        Insert: {
          id?: string | null;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          department?: string | null;
          profile_created_at?: string | null;
          user_created_at?: string | null;
        };
        Update: {
          id?: string | null;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          department?: string | null;
          profile_created_at?: string | null;
          user_created_at?: string | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[
      Extract<
        keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
          Database[PublicTableNameOrOptions['schema']]['Views']),
        string
      >
    ]
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions]
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? PublicSchema['Tables'][Extract<
      keyof PublicSchema['Tables'],
      string
    >]['Insert']
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions]['Insert']
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? PublicSchema['Tables'][Extract<
      keyof PublicSchema['Tables'],
      string
    >]['Update']
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions]['Update']
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][Extract<
      keyof Database[PublicEnumNameOrOptions['schema']]['Enums'],
      string
    >]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;