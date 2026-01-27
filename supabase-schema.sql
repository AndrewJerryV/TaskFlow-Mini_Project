-- TaskFlow Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Member')),
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- AI / Smart Assign Fields
  skills TEXT[] DEFAULT '{}',
  wellness_score INTEGER DEFAULT 100,
  max_workload INTEGER DEFAULT 5,
  phone TEXT,
  office_address TEXT,
  -- Settings fields
  timezone TEXT DEFAULT 'UTC (Coordinated Universal Time)',
  quiet_hours_start TEXT DEFAULT '20:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  quiet_hours_weekends BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  -- AI Settings
  burnout_sensitivity INTEGER DEFAULT 2,
  auto_assign BOOLEAN DEFAULT true,
  skill_match_priority BOOLEAN DEFAULT true,
  ai_deadlines BOOLEAN DEFAULT false,
  -- Notification Settings
  email_digest_frequency TEXT DEFAULT 'Daily Summary',
  push_notifications BOOLEAN DEFAULT true,
  sound_alerts BOOLEAN DEFAULT true
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  key TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('To Do', 'In Progress', 'Review', 'Done')),
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  assignee_id UUID REFERENCES users(id),
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}'
);



-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'page' or 'file'
  content TEXT, -- Markdown content for pages
  file_path TEXT, -- Storage path for files
  file_type TEXT, -- MIME type
  size INTEGER, -- File size in bytes
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage Bucket (Auto-create if using Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies (Allow Request for Demo/Prototype)

-- DOCUMENTS TABLE SECURITY
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to documents" ON documents;
DROP POLICY IF EXISTS "Enable all access for all users" ON documents;

-- Create permissive policy
CREATE POLICY "Enable all access for all users"
ON documents FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- STORAGE SECURITY
-- Allow uploads to the project-files bucket
-- Note: 'storage.objects' policies can be tricky. We ensure 'public' has access.

DROP POLICY IF EXISTS "Allow public uploads to project-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select from project-files" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to project-files" ON storage.objects;

CREATE POLICY "Give public access to project-files"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'project-files')
WITH CHECK (bucket_id = 'project-files');

-- Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'project-files';

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('Task', 'Project')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('Created', 'Updated', 'Deleted', 'Moved', 'Commented')),
  details TEXT,
  user_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'draft',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form responses table
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  respondent_id TEXT,
  answers JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for development)
-- In production, you should create more restrictive policies
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for forms" ON forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for form_responses" ON form_responses FOR ALL USING (true) WITH CHECK (true);

-- Seed initial users (using fixed UUIDs for compatibility)
INSERT INTO users (id, name, email, role, avatar_url, skills, wellness_score, max_workload) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Andrew User', 'andrew@example.com', 'Admin', 'https://ui-avatars.com/api/?name=Andrew+User&background=0D8ABC&color=fff', ARRAY['Frontend', 'Design', 'React', 'Product'], 95, 5),
  ('00000000-0000-0000-0000-000000000002', 'Jane Doe', 'jane@example.com', 'Manager', 'https://ui-avatars.com/api/?name=Jane+Doe&background=random', ARRAY['Backend', 'AI', 'Machine Learning', 'Python', 'Database'], 78, 5)
ON CONFLICT (id) DO NOTHING;

-- Generic update for any other users
UPDATE users SET skills = ARRAY['Frontend', 'Backend', 'Design', 'DevOps', 'Testing', 'Database', 'API', 'AI', 'Machine Learning', 'Python'], wellness_score = 80, max_workload = 5 WHERE skills = '{}' OR skills IS NULL;

-- Add contact columns if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS office_address TEXT;

-- Seed Indian Contact Info
UPDATE users SET phone = '+91 98765 43210', office_address = '123, Tech Park, Whitefield, Bangalore, KA' WHERE email = 'andrew@example.com';
UPDATE users SET phone = '+91 99887 76655', office_address = '456, Cyber City, Gurgaon, HR' WHERE email = 'jane@example.com';
