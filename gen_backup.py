import json
import os
import re

# Paths to the step outputs
STEPS_DIR = r"C:\Users\Andrew\.gemini\antigravity\brain\a908ba53-76e6-4d85-b9d4-7a56cfa17663\.system_generated\steps"
OUTPUT_FILE = r"C:\Users\Andrew\Desktop\Mini Project\task-flow\backup.sql"

# Mapping of tables to step IDs
TABLE_STEPS = {
    "users": 300,
    "projects": 374,
    "tasks": 299,
    "activity_logs": 295,
    "documents": 375,
    "messages": 296,
    "comments": 367
}

# For tables that were small and not saved to files, provide data here
DIRECT_DATA = {
    374: [
        {"id":"a1111111-1111-1111-1111-111111111111","name":"TaskFlow Web App","description":"Main web application built with Next.js, React, and Supabase. Includes task management, team collaboration, and real-time updates.","key":"TFW","owner_id":"00000000-0000-0000-0000-000000000001","created_at":"2026-01-01 04:30:00+00","updated_at":"2026-01-28 03:30:00+00"},
        {"id":"a2222222-2222-2222-2222-222222222222","name":"AI Recommendation Engine","description":"Machine learning powered smart assignment system using Python, TensorFlow, and FastAPI for intelligent task distribution.","key":"AIR","owner_id":"00000000-0000-0000-0000-000000000002","created_at":"2026-01-05 05:30:00+00","updated_at":"2026-01-27 09:00:00+00"},
        {"id":"a3333333-3333-3333-3333-333333333333","name":"Mobile App (Flutter)","description":"Cross-platform mobile application for iOS and Android using Flutter and Firebase for offline-first experience.","key":"MOB","owner_id":"00000000-0000-0000-0000-000000000004","created_at":"2026-01-10 04:00:00+00","updated_at":"2026-01-26 10:30:00+00"},
        {"id":"a4444444-4444-4444-4444-444444444444","name":"DevOps & Infrastructure","description":"Cloud infrastructure on AWS/Azure with Kubernetes, CI/CD pipelines, monitoring, and auto-scaling configurations.","key":"DEV","owner_id":"00000000-0000-0000-0000-000000000005","created_at":"2026-01-08 02:30:00+00","updated_at":"2026-01-28 05:30:00+00"},
        {"id":"ab5edf1a-405a-467f-9e77-fba38383705f","name":"Aurh building","description":"hurry","key":"777","owner_id":"u1","created_at":"2026-02-04 11:58:25.598+00","updated_at":"2026-02-04 11:58:25.598+00"},
        {"id":"09b2aa11-5620-49db-a99b-a49fd8172351","name":"Flutter","description":"for app development","key":"FFEJF","owner_id":"u1","created_at":"2026-02-17 05:03:38.639+00","updated_at":"2026-02-17 05:03:38.639+00"}
    ],
    375: [
        {"id":"847c0e58-b032-4b80-ae20-aacc9a97c6c8","project_id":"a1111111-1111-1111-1111-111111111111","title":"First Review - Team 6.pptx","type":"file","content":None,"file_path":"a1111111-1111-1111-1111-111111111111/1769620204675-649u39.pptx","file_type":"application/vnd.openxmlformats-officedocument.presentationml.presentation","size":3627582,"created_by":"00000000-0000-0000-0000-000000000001","created_at":"2026-01-28 17:10:15.088829+00","updated_at":"2026-01-28 17:10:15.088829+00"},
        {"id":"363a5d4d-85c7-4d63-8f9d-ec6602001b9c","project_id":"a1111111-1111-1111-1111-111111111111","title":"Second Review - Team 6.pptx","type":"file","content":None,"file_path":"a1111111-1111-1111-1111-111111111111/1769620223947-c7gf.pptx","file_type":"application/vnd.openxmlformats-officedocument.presentationml.presentation","size":10742318,"created_by":"00000000-0000-0000-0000-000000000001","created_at":"2026-01-28 17:10:47.002387+00","updated_at":"2026-01-28 17:10:47.002387+00"},
        {"id":"8b57fa61-c917-4dc8-acc4-03ebd54f4652","project_id":"a1111111-1111-1111-1111-111111111111","title":"Sequence-GUI - Team 6.pptx","type":"file","content":None,"file_path":"a1111111-1111-1111-1111-111111111111/1770570533940-yhpv8.pptx","file_type":"application/vnd.openxmlformats-officedocument.presentationml.presentation","size":9790624,"created_by":"00000000-0000-0000-0000-000000000001","created_at":"2026-02-08 17:09:13.438165+00","updated_at":"2026-02-08 17:09:13.438165+00"}
    ]
}

def extract_json(step_id):
    if step_id in DIRECT_DATA:
        return DIRECT_DATA[step_id]
        
    file_path = os.path.join(STEPS_DIR, str(step_id), "output.txt")
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return []
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()
    
    # The file content itself might be a JSON-encoded string
    if (content.startswith('"') and content.endswith('"')) or (content.startswith('{') and content.endswith('}')):
        try:
            content = json.loads(content)
        except:
            pass
    
    # Extract JSON between untrusted data tags
    # Match the content between the first occurrence of the tag and its closing tag
    # We look for the pattern between <untrusted-data-ID> and </untrusted-data-ID>
    match = re.search(r"<untrusted-data-[^>]+>(.*?)</untrusted-data-", content, re.DOTALL)
    if not match:
        print(f"Failed to find untrusted-data tags for step {step_id}")
        return []
    
    json_str = match.group(1).strip()
    # Some outputs have a leading newline or extra text before JSON
    if "[" in json_str:
        json_str = json_str[json_str.find("["):]
    if "]" in json_str:
        json_str = json_str[:json_str.rfind("]")+1]
        
    try:
        data = json.loads(json_str)
        return data
    except Exception as e:
        print(f"Error parsing JSON for step {step_id}: {e}")
        return []

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, list):
        return f"ARRAY{json.dumps(val)}::TEXT[]"
    
    # Escape single quotes
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

def generate_insert(table_name, columns, rows):
    if not rows:
        return ""
    
    sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES\n"
    values_list = []
    for row in rows:
        vals = [escape_sql(row.get(col)) for col in columns]
        values_list.append(f"({', '.join(vals)})")
    
    sql += ",\n".join(values_list) + ";\n\n"
    return sql

def main():
    backup_sql = []
    
    # 1. Table Definitions (From research)
    # Note: I'll use simple definitions that match the data types seen.
    schema = """
-- Schema Backup
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT now(),
    skills TEXT[],
    wellness_score INTEGER DEFAULT 100,
    max_workload INTEGER DEFAULT 5,
    phone TEXT,
    office_address TEXT,
    timezone TEXT DEFAULT 'UTC',
    quiet_hours_start TEXT,
    quiet_hours_end TEXT,
    quiet_hours_weekends BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    burnout_sensitivity INTEGER DEFAULT 3,
    auto_assign BOOLEAN DEFAULT TRUE,
    skill_match_priority BOOLEAN DEFAULT TRUE,
    ai_deadlines BOOLEAN DEFAULT FALSE,
    email_digest_frequency TEXT DEFAULT 'Daily Summary',
    push_notifications BOOLEAN DEFAULT TRUE,
    sound_alerts BOOLEAN DEFAULT TRUE
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    key TEXT UNIQUE NOT NULL,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'To Do',
    priority TEXT DEFAULT 'Medium',
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    tags TEXT[]
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    user_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    file_path TEXT,
    file_type TEXT,
    size BIGINT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    attachment JSONB
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

"""
    backup_sql.append(schema)

    # 2. Extract and insert data in correct order for FKs
    order = ["users", "projects", "tasks", "activity_logs", "documents", "messages", "comments"]
    
    for table in order:
        step_id = TABLE_STEPS[table]
        print(f"Processing data for {table}...")
        rows = extract_json(step_id)
        if rows:
            columns = list(rows[0].keys())
            # For messages, handle attachment type if needed
            insert_sql = generate_insert(table, columns, rows)
            backup_sql.append(insert_sql)

    # Write to file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("".join(backup_sql))
    
    print(f"Backup file generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
