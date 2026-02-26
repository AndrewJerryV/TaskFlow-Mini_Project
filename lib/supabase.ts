import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// The URL is derived from the project reference in the connection string
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fawhdeawrihomivctrnw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy initialization to prevent build-time errors
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        if (!supabaseAnonKey) {
            throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Please set it in your .env.local file.');
        }
        _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _supabase;
}

// Database types matching our schema
export interface DbUser {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    role: 'Admin' | 'Manager' | 'Member';
    created_at?: string;
    skills?: string[];
    wellness_score?: number;
    max_workload?: number;
    phone?: string;
    office_address?: string;
    // Settings
    timezone?: string;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    quiet_hours_weekends?: boolean;
    two_factor_enabled?: boolean;
    // AI Settings
    burnout_sensitivity?: number;
    auto_assign?: boolean;
    skill_match_priority?: boolean;
    ai_deadlines?: boolean;
    // Notification Settings
    email_digest_frequency?: string;
    push_notifications?: boolean;
    sound_alerts?: boolean;
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
    project_id: string;
    user_id: string;
    content: string;
    timestamp: string;
    attachment?: string; // JSON string of Attachment
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
    fields: string; // JSON string of FormField[]
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

export interface DbFormLink {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    form_url: string;
    created_by?: string;
    created_at: string;
}
