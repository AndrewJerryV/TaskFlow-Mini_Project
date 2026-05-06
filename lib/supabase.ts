import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resolveClientSupabaseConfig } from './browser-supabase-config';

let supabase: SupabaseClient | null = null;
let cachedClientKey: string | null = null;

function getServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getSupabase(): SupabaseClient {
  const isServer = typeof window === 'undefined';
  const config = isServer ? getServerConfig() : resolveClientSupabaseConfig();

  if (!config) {
    throw new Error(
      isServer
        ? 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on the server'
        : 'Missing Supabase client configuration. Complete setup first.'
    );
  }

  const nextClientKey = `${isServer ? 'server' : 'client'}:${config.url}:${config.anonKey}`;

  if (!supabase || cachedClientKey !== nextClientKey) {
    supabase = createClient(
      config.url,
      config.anonKey,
      {
        auth: {
          persistSession: !isServer,
          autoRefreshToken: !isServer,
          detectSessionInUrl: !isServer,
          flowType: 'pkce'
        }
      }
    );
    cachedClientKey = nextClientKey;
  }

  return supabase;
}

export function resetSupabaseClient(): void {
  supabase = null;
  cachedClientKey = null;
}

// Database Types

export interface DbUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'Admin' | 'Manager' | 'Member';
  created_at?: string;
  dob?: string;
  skill_experience?: Record<string, number>;
  skills?: string[];
  wellness_score?: number;
  max_workload?: number;
  phone?: string;
  office_address?: string;
  age?: number;

  timezone?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_weekends?: boolean;
  two_factor_enabled?: boolean;
  company_size?: string;

  burnout_sensitivity?: number;
  auto_assign?: boolean;
  skill_match_priority?: boolean;
  ai_deadlines?: boolean;

}

export interface DbProjectMember {
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface DbDocument {
  id: string;
  project_id: string;
  title: string;
  type: string;
  content?: string;
  file_path?: string;
  file_type?: string;
  size?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  description?: string;
  key: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignee_id?: string;
  due_date?: string;
  start_date?: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  time_logs?: any;
  active_timer_start?: string;
  dependencies?: string[];
}

export interface DbActivityLog {
  id: string;
  entity_type: 'Task' | 'Project';
  entity_id: string;
  action: 'Created' | 'Updated' | 'Deleted' | 'Moved' | 'Commented';
  details?: string;
  user_id: string;
  timestamp: string;
}

export interface DbMessage {
  id: string;
  project_id?: string | null;
  user_id: string;
  content: string;
  timestamp: string;
  attachment?: string;
  conversation_type?: 'project' | 'dm';
  recipient_id?: string | null;
  thread_root_id?: string | null;
  reactions?: string | null;
  is_pinned?: boolean;
}

export interface DbComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface DbForm {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  fields: string;
  status: 'draft' | 'active' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbFormResponse {

  id: string;
  form_id: string;
  respondent_id: string;
  answers: string; // JSON string of Record<string, any>
  submitted_at: string;
}

export interface DbShortcut {
  id: string;
  project_id: string;
  name: string;
  url: string;
  type: 'link' | 'repository';
  created_at: string;
}

export interface DbRepoLink {
  id: string;
  project_id: string;
  name: string;
  url: string;
  owner: string;
  repo: string;
  description?: string;
  added_at: string;
}


export interface DbNotification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_status_changed' | 'new_message' | 'new_form' | 'general';
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  entity_id?: string;
  project_id?: string;
  created_at: string;
}

export interface DbDeployment {
  id: string;
  project_id: string;
  version: string;
  environment: 'Development' | 'Staging' | 'Production';
  status: 'In Progress' | 'Completed' | 'Failed';
  release_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbDeploymentTask {
  deployment_id: string;
  task_id: string;
  linked_at: string;
}

export interface DbTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  project_id?: string;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  note?: string;
  created_at: string;
}
