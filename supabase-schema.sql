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

-- Seed initial users with realistic Indian details (using fixed UUIDs for compatibility)
INSERT INTO users (id, name, email, role, avatar_url, skills, wellness_score, max_workload, phone, office_address, timezone, burnout_sensitivity, auto_assign, skill_match_priority) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Andrew Jerry',
    'andrew.jerry@taskflow.in',
    'Admin',
    'https://ui-avatars.com/api/?name=Andrew+Jerry&background=0066CC&color=fff&size=128',
    ARRAY['React', 'Next.js', 'TypeScript', 'UI/UX Design', 'Product Management', 'Figma'],
    92, 6,
    '+91 98451 23456',
    '42, Indiranagar 100 Feet Road, HAL 2nd Stage, Bangalore, Karnataka 560038',
    'Asia/Kolkata', 2, true, true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Jane Sharma',
    'jane.sharma@taskflow.in',
    'Manager',
    'https://ui-avatars.com/api/?name=Jane+Sharma&background=9C27B0&color=fff&size=128',
    ARRAY['Python', 'Machine Learning', 'TensorFlow', 'Data Science', 'PostgreSQL', 'FastAPI'],
    85, 5,
    '+91 99001 54321',
    'Tower B, Floor 12, DLF Cyber City, Sector 24, Gurgaon, Haryana 122002',
    'Asia/Kolkata', 3, true, true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Jishnu Vijayan',
    'jishnu.vijayan@taskflow.in',
    'Member',
    'https://ui-avatars.com/api/?name=Jishnu+Vijayan&background=4CAF50&color=fff&size=128',
    ARRAY['Node.js', 'Express.js', 'MongoDB', 'Docker', 'AWS', 'Microservices', 'Redis'],
    88, 5,
    '+91 94461 78923',
    'Technopark Campus, Phase 3, Kazhakkoottam, Thiruvananthapuram, Kerala 695581',
    'Asia/Kolkata', 2, true, true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Felvin Jose',
    'felvin.jose@taskflow.in',
    'Member',
    'https://ui-avatars.com/api/?name=Felvin+Jose&background=FF5722&color=fff&size=128',
    ARRAY['Vue.js', 'Nuxt.js', 'GraphQL', 'Tailwind CSS', 'Firebase', 'Flutter', 'Dart'],
    78, 4,
    '+91 90724 56789',
    '5th Floor, Kakkanad IT Park, Infopark SEZ, Kochi, Kerala 682030',
    'Asia/Kolkata', 3, true, false
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Milan Nair',
    'milan.nair@taskflow.in',
    'Member',
    'https://ui-avatars.com/api/?name=Milan+Nair&background=2196F3&color=fff&size=128',
    ARRAY['Kubernetes', 'Terraform', 'CI/CD', 'Jenkins', 'Azure', 'Linux', 'Shell Scripting', 'Prometheus'],
    95, 6,
    '+91 98254 32109',
    'GIFT City Tower 2, Floor 8, Gandhinagar, Gujarat 382355',
    'Asia/Kolkata', 1, true, true
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Priya Menon',
    'priya.menon@taskflow.in',
    'Member',
    'https://ui-avatars.com/api/?name=Priya+Menon&background=E91E63&color=fff&size=128',
    ARRAY['Java', 'Spring Boot', 'MySQL', 'Hibernate', 'REST API', 'JUnit', 'Maven'],
    90, 5,
    '+91 94478 12345',
    'Prestige Tech Park, Building 7, Marathahalli, Bangalore, Karnataka 560103',
    'Asia/Kolkata', 2, true, true
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Rahul Krishnan',
    'rahul.krishnan@taskflow.in',
    'Member',
    'https://ui-avatars.com/api/?name=Rahul+Krishnan&background=673AB7&color=fff&size=128',
    ARRAY['Angular', 'RxJS', 'NgRx', 'TypeScript', 'SCSS', 'Jest', 'Cypress'],
    82, 5,
    '+91 98765 09876',
    'Embassy Golf Links, Block C, Koramangala, Bangalore, Karnataka 560071',
    'Asia/Kolkata', 2, true, true
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Sneha Gupta',
    'sneha.gupta@taskflow.in',
    'Manager',
    'https://ui-avatars.com/api/?name=Sneha+Gupta&background=00BCD4&color=fff&size=128',
    ARRAY['Agile', 'Scrum', 'JIRA', 'Confluence', 'Project Management', 'Stakeholder Management', 'Risk Analysis'],
    88, 4,
    '+91 99100 88776',
    'WeWork Galaxy, Residency Road, Ashok Nagar, Bangalore, Karnataka 560025',
    'Asia/Kolkata', 3, false, true
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Arun Pillai',
    'arun.pillai@taskflow.in',
    'Member',
    'https://ui-avatars.com/api/?name=Arun+Pillai&background=009688&color=fff&size=128',
    ARRAY['iOS', 'Swift', 'SwiftUI', 'Objective-C', 'Xcode', 'Core Data', 'ARKit'],
    86, 5,
    '+91 94955 67890',
    'SmartCity Kochi, Tower 3, Kakkanad, Kochi, Kerala 682042',
    'Asia/Kolkata', 2, true, true
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'Divya Reddy',
    'divya.reddy@taskflow.in',
    'Member',
    'https://ui-avatars.com/api/?name=Divya+Reddy&background=FF9800&color=fff&size=128',
    ARRAY['QA', 'Selenium', 'Appium', 'Postman', 'API Testing', 'Performance Testing', 'JMeter'],
    91, 5,
    '+91 90001 23456',
    'Raheja Mindspace, Tower 2, HITEC City, Hyderabad, Telangana 500081',
    'Asia/Kolkata', 1, true, true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  avatar_url = EXCLUDED.avatar_url,
  skills = EXCLUDED.skills,
  wellness_score = EXCLUDED.wellness_score,
  max_workload = EXCLUDED.max_workload,
  phone = EXCLUDED.phone,
  office_address = EXCLUDED.office_address,
  timezone = EXCLUDED.timezone,
  burnout_sensitivity = EXCLUDED.burnout_sensitivity,
  auto_assign = EXCLUDED.auto_assign,
  skill_match_priority = EXCLUDED.skill_match_priority;


