import { NextResponse } from 'next/server';

const TASKFLOW_SCHEMA_SQL = `
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  email text unique,
  name text not null,
  avatar_url text,
  role text not null default 'Member' check (role in ('Admin', 'Manager', 'Member')),
  created_at timestamptz not null default now(),
  dob date,
  skill_experience jsonb not null default '{}'::jsonb,
  skills text[] not null default '{}'::text[],
  wellness_score integer not null default 85,
  max_workload integer not null default 5,
  phone text,
  office_address text,
  age integer,
  timezone text,
  quiet_hours_start text,
  quiet_hours_end text,
  quiet_hours_weekends boolean not null default false,
  two_factor_enabled boolean not null default false,
  company_size text,
  burnout_sensitivity integer not null default 50,
  auto_assign boolean not null default true,
  skill_match_priority boolean not null default true,
  ai_deadlines boolean not null default true
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  key text not null,
  owner_id uuid references public.users(id) on delete set null,
  meeting_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'Member',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'To Do',
  priority text not null default 'Medium',
  assignee_id uuid references public.users(id) on delete set null,
  due_date date,
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tags text[] not null default '{}'::text[],
  time_logs jsonb,
  active_timer_start timestamptz,
  dependencies text[] not null default '{}'::text[]
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details text,
  user_id uuid references public.users(id) on delete set null,
  timestamp timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  timestamp timestamptz not null default now(),
  attachment jsonb,
  conversation_type text not null default 'project',
  recipient_id uuid references public.users(id) on delete cascade,
  thread_root_id uuid references public.messages(id) on delete cascade,
  reactions jsonb,
  is_pinned boolean not null default false
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  respondent_id uuid references public.users(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  type text not null,
  content text,
  file_path text,
  file_type text,
  size integer,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shortcuts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  url text not null,
  type text not null default 'link',
  created_at timestamptz not null default now()
);

create table if not exists public.repo_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  url text not null,
  owner text not null,
  repo text not null,
  description text,
  added_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  link text,
  entity_id uuid,
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version text not null,
  environment text not null,
  status text not null,
  release_notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deployment_tasks (
  deployment_id uuid not null references public.deployments(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (deployment_id, task_id)
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes integer,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create or replace function public.get_autocomplete_data()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'skills', coalesce((select jsonb_agg(distinct skill) from public.users, unnest(skills) as skill), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(distinct tag) from public.tasks, unnest(tags) as tag), '[]'::jsonb),
    'titles', coalesce((select jsonb_agg(distinct title) from public.tasks), '[]'::jsonb)
  );
$$;

create or replace function public.get_admin_create_user_v2_definition()
returns text
language sql
stable
as $$
  select 'TaskFlow setup created the public schema. New users are created through Supabase Auth signUp during setup.';
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language sql
security definer
as $$
  delete from public.users where id = p_user_id;
$$;

create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_messages_project_id on public.messages(project_id);
create index if not exists idx_messages_recipient_id on public.messages(recipient_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_time_entries_user_id on public.time_entries(user_id);
`;

function getProjectRef(supabaseUrl: string) {
  try {
    const host = new URL(supabaseUrl).hostname;
    const [ref, ...rest] = host.split('.');
    if (!ref || rest.join('.') !== 'supabase.co') {
      return null;
    }
    return ref;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown setup error';
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      supabaseUrl?: string;
      accessToken?: string;
    };

    const supabaseUrl = body.supabaseUrl?.trim();
    const accessToken = body.accessToken?.trim();
    const projectRef = supabaseUrl ? getProjectRef(supabaseUrl) : null;

    if (!supabaseUrl || !projectRef) {
      return NextResponse.json(
        { ok: false, error: 'Enter a valid Supabase project URL.' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Enter a Supabase access token to create tables.' },
        { status: 400 }
      );
    }

    // Safety check: if the users table already has rows, abort to avoid accidental data loss.
    // Some management operations can be destructive on poorly-scoped SQL; never run schema creation
    // that might alter or recreate tables when there is existing user data.
    const checkResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `select count(*)::int as cnt from public.users;`,
        read_only: true,
      }),
    });

    const checkResult = await checkResponse.json().catch(() => null);

    if (checkResponse.ok && Array.isArray(checkResult?.result) && checkResult.result[0] && typeof checkResult.result[0].cnt === 'number') {
      const existing = checkResult.result[0].cnt as number;
      if (existing > 0) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          message: 'Schema application skipped: public.users already contains rows. No destructive changes performed.'
        });
      }
    }

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: TASKFLOW_SCHEMA_SQL,
        read_only: false,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result?.message || result?.error || 'Supabase could not create the tables.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      projectRef,
      tables: [
        'users',
        'projects',
        'project_members',
        'tasks',
        'activity_logs',
        'messages',
        'comments',
        'forms',
        'form_responses',
        'documents',
        'shortcuts',
        'repo_links',
        'notifications',
        'deployments',
        'deployment_tasks',
        'time_entries',
        'otps',
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
