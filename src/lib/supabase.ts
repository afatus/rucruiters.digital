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
    };
  };
};