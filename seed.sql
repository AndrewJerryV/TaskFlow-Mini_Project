-- ============================================================
-- TaskFlow Web App - Comprehensive Seed Data (Master Final Version v1.4)
-- Generated: 2026-03-17
-- ============================================================

DO $$
DECLARE
    -- IDs
    v_project_id UUID;
    v_admin_id UUID;
    v_manager_id UUID;
    v_milan_id UUID;
    v_jishnu_id UUID;
    v_priya_id UUID;
    v_felvin_id UUID;

    -- Task IDs
    v_tasks UUID[] := ARRAY[]::UUID[];
    
    -- Deployment IDs
    v_dep_prod UUID := gen_random_uuid();
    v_dep_stg UUID := gen_random_uuid();
    v_dep_dev UUID := gen_random_uuid();
    
    -- Form IDs
    v_form_retro UUID := gen_random_uuid();
    v_form_security UUID := gen_random_uuid();
    
    i INT;
BEGIN
    -- 1. RESOLVE PROJECT ID
    SELECT id INTO v_project_id FROM projects WHERE name ILIKE '%TaskFlow Web App%' LIMIT 1;
    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL ERROR: Project "TaskFlow Web App" not found.';
    END IF;

    -- 2. RESOLVE USER IDs (Robust Wildcard)
    SELECT id INTO v_admin_id FROM users WHERE email ILIKE '%andrew%' OR name ILIKE '%Andrew%' LIMIT 1;
    SELECT id INTO v_manager_id FROM users WHERE email ILIKE '%sneha%' OR name ILIKE '%Sneha%' LIMIT 1;
    SELECT id INTO v_milan_id FROM users WHERE email ILIKE '%milan%' OR name ILIKE '%Milan%' LIMIT 1;
    SELECT id INTO v_jishnu_id FROM users WHERE email ILIKE '%23br15569%' LIMIT 1;
    IF v_jishnu_id IS NULL THEN SELECT id INTO v_jishnu_id FROM users WHERE name ILIKE '%Jishnu%' LIMIT 1; END IF;
    SELECT id INTO v_priya_id FROM users WHERE email ILIKE '%23br15676%' LIMIT 1;
    IF v_priya_id IS NULL THEN SELECT id INTO v_priya_id FROM users WHERE name ILIKE '%Priya%' LIMIT 1; END IF;
    SELECT id INTO v_felvin_id FROM users WHERE email ILIKE '%felvin%' OR name ILIKE '%Felvin%' LIMIT 1;

    IF v_admin_id IS NULL OR v_manager_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL ERROR: Required users not found.';
    END IF;

    -- 3. CLEANUP
    DELETE FROM deployment_tasks WHERE deployment_id::text IN (SELECT id::text FROM deployments WHERE project_id::text = v_project_id::text) OR deployment_id::text IN (v_dep_prod::text, v_dep_stg::text, v_dep_dev::text);
    DELETE FROM deployments WHERE project_id::text = v_project_id::text;
    DELETE FROM activity_logs WHERE entity_id::text = v_project_id::text OR entity_id::text IN (SELECT id::text FROM tasks WHERE project_id::text = v_project_id::text);
    DELETE FROM time_entries WHERE project_id::text = v_project_id::text;
    DELETE FROM form_responses WHERE form_id::text IN (SELECT id::text FROM forms WHERE project_id::text = v_project_id::text);
    DELETE FROM forms WHERE project_id::text = v_project_id::text;
    DELETE FROM comments WHERE task_id::text IN (SELECT id::text FROM tasks WHERE project_id::text = v_project_id::text);
    DELETE FROM messages WHERE project_id::text = v_project_id::text;
    DELETE FROM project_members WHERE project_id::text = v_project_id::text;
    DELETE FROM tasks WHERE project_id::text = v_project_id::text;

    -- 4. ENSURE MEMBERSHIPS
    INSERT INTO project_members (project_id, user_id, role) VALUES
    (v_project_id, v_admin_id, 'Admin'),
    (v_project_id, v_manager_id, 'Manager')
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    
    INSERT INTO project_members (project_id, user_id, role) 
    SELECT v_project_id, v_milan_id, 'Member' WHERE v_milan_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'Member';
    
    INSERT INTO project_members (project_id, user_id, role) 
    SELECT v_project_id, v_jishnu_id, 'Member' WHERE v_jishnu_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'Member';
    
    INSERT INTO project_members (project_id, user_id, role) 
    SELECT v_project_id, v_priya_id, 'Member' WHERE v_priya_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'Member';
    
    INSERT INTO project_members (project_id, user_id, role) 
    SELECT v_project_id, v_felvin_id, 'Member' WHERE v_felvin_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'Member';

    -- 5. PROFESSIONAL TASKS (15 UNIQUE ITEMS)
    v_tasks := ARRAY[
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ];

    INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, due_date, start_date, tags) VALUES
    -- Andrew (Admin) - LEAD (6 Tasks)
    (v_tasks[1], v_project_id, 'Core Architecture Migration', 'Implement multi-tenant Supabase schema.', 'Done', 'Critical', v_admin_id, NOW() - INTERVAL '15 days', NOW() - INTERVAL '20 days', ARRAY['infra']),
    (v_tasks[2], v_project_id, 'Auth Security Hardening', 'Setup 2FA and RLS policies.', 'Done', 'Critical', v_admin_id, NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days', ARRAY['security']),
    (v_tasks[3], v_project_id, 'Global State Refactor', 'Migrate to Context/Zustand for better perf.', 'To Do', 'High', v_admin_id, NOW() + INTERVAL '2 days', NULL, ARRAY['core']),
    (v_tasks[11], v_project_id, 'Critical Fix: Memory Leak', 'Investigate heavy Node.js heap usage in prod.', 'In Progress', 'Critical', v_admin_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days', ARRAY['bug']),
    (v_tasks[14], v_project_id, 'CI/CD Pipeline v2', 'Switch to GitHub Actions with auto-scaling.', 'To Do', 'High', v_admin_id, NOW() + INTERVAL '12 days', NULL, ARRAY['devops']),
    (v_tasks[15], v_project_id, 'System Backup Automation', 'Setup nightly WAL-G backups to S3.', 'To Do', 'Medium', v_admin_id, NOW() + INTERVAL '14 days', NULL, ARRAY['infra']),
    -- Jishnu (3 Tasks)
    (v_tasks[4], v_project_id, 'Analytics Engine UI', 'Interactive workload distribution charts.', 'To Do', 'High', v_jishnu_id, NOW() + INTERVAL '3 days', NULL, ARRAY['ui']),
    (v_tasks[9], v_project_id, 'Workflow Health Predictor', 'Algorithm for identifying bottleneck tasks.', 'In Progress', 'Medium', v_jishnu_id, NOW() + INTERVAL '5 days', NOW() - INTERVAL '2 days', ARRAY['ai']),
    (v_tasks[12], v_project_id, 'Integration Test Suite', 'End-to-end testing with Playwright.', 'To Do', 'High', v_jishnu_id, NOW() + INTERVAL '8 days', NULL, ARRAY['testing']),
    -- Felvin (2 Tasks)
    (v_tasks[8], v_project_id, 'Performance Optimization', 'Memoize heavy React renders.', 'In Progress', 'High', v_felvin_id, NOW() + INTERVAL '2 days', NOW() - INTERVAL '5 days', ARRAY['perf']),
    (v_tasks[13], v_project_id, 'API Rate Limiting', 'Implement Redis-based protection.', 'To Do', 'High', v_felvin_id, NOW() + INTERVAL '9 days', NULL, ARRAY['api']),
    -- Priya (2 Tasks)
    (v_tasks[7], v_project_id, 'Documentation Refresh', 'Comprehensive API and Setup docs.', 'To Do', 'Low', v_priya_id, NOW() + INTERVAL '6 days', NULL, ARRAY['docs']),
    (v_tasks[10], v_project_id, 'Mobile Workspace UI', 'Responsive sidebar and navigation.', 'To Do', 'Medium', v_priya_id, NOW() + INTERVAL '7 days', NULL, ARRAY['mobile']),
    -- Sneha (1 Task)
    (v_tasks[5], v_project_id, 'Compliance & Security Audit', 'Ensure SOC2 readiness.', 'Review', 'High', v_manager_id, NOW() + INTERVAL '1 day', NOW() - INTERVAL '10 days', ARRAY['manager']),
    -- Milan (1 Task)
    (v_tasks[6], v_project_id, 'Asset Cleanup', 'Remove old icons and unused libraries.', 'Done', 'Low', v_milan_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days', ARRAY['cleanup']);

    -- 6. TIME TRACKING (Andrew: ~19h, Jishnu: ~13h, Felvin: ~9h)
    INSERT INTO time_entries (id, task_id, user_id, project_id, start_time, end_time, duration_minutes, note) VALUES
    (gen_random_uuid(), v_tasks[1], v_admin_id, v_project_id, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '250 minutes', 250, 'Infra migration phase 1'),
    (gen_random_uuid(), v_tasks[2], v_admin_id, v_project_id, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '210 minutes', 210, 'RLS policy setup'),
    (gen_random_uuid(), v_tasks[3], v_admin_id, v_project_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '180 minutes', 180, 'Zustand refactor start'),
    (gen_random_uuid(), v_tasks[1], v_admin_id, v_project_id, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '240 minutes', 240, 'Schema design phase'),
    (gen_random_uuid(), v_tasks[11], v_admin_id, v_project_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '240 minutes', 240, 'Heap profiling'),
    (gen_random_uuid(), v_tasks[4], v_jishnu_id, v_project_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '210 minutes', 210, 'Graph integration'),
    (gen_random_uuid(), v_tasks[9], v_jishnu_id, v_project_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '180 minutes', 180, 'Health algo logic'),
    (gen_random_uuid(), v_tasks[4], v_jishnu_id, v_project_id, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '240 minutes', 240, 'UI data mapping layer'),
    (gen_random_uuid(), v_tasks[12], v_jishnu_id, v_project_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '150 minutes', 150, 'Test setup'),
    (gen_random_uuid(), v_tasks[8], v_felvin_id, v_project_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '220 minutes', 220, 'Perf audit'),
    (gen_random_uuid(), v_tasks[13], v_felvin_id, v_project_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '180 minutes', 180, 'Redis config'),
    (gen_random_uuid(), v_tasks[8], v_felvin_id, v_project_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '160 minutes', 160, 'Memoization fixes'),
    (gen_random_uuid(), v_tasks[5], v_manager_id, v_project_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '90 minutes', 90, 'Audit review'),
    (gen_random_uuid(), v_tasks[5], v_manager_id, v_project_id, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '120 minutes', 120, 'Compliance checklist'),
    (gen_random_uuid(), v_tasks[7], v_priya_id, v_project_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '80 minutes', 80, 'Doc outline'),
    (gen_random_uuid(), v_tasks[10], v_priya_id, v_project_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '60 minutes', 60, 'Responsive baseline'),
    (gen_random_uuid(), v_tasks[6], v_milan_id, v_project_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes', 45, 'Minor cleanup');

    -- 7. RICH CHAT MESSAGES (30 MESSAGES)
    INSERT INTO messages (id, project_id, user_id, content, timestamp, attachment) VALUES
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Team, final sprint starts now.', NOW() - INTERVAL '10 days', NULL),
    (gen_random_uuid(), v_project_id, v_manager_id::text, 'Excited to see the progress!', NOW() - INTERVAL '9 days 23 hours', NULL),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Check out the new design system baseline.', NOW() - INTERVAL '9 days', '{"name":"design_v1.png", "type":"image", "url":"https://images.unsplash.com/photo-1586717791821-3f44a563cc4c?q=80&w=800", "size":"1.2MB"}'),
    (gen_random_uuid(), v_project_id, v_milan_id::text, 'Looks clean!', NOW() - INTERVAL '8 days 22 hours', NULL),
    (gen_random_uuid(), v_project_id, v_jishnu_id::text, 'Integration with the charts going smoothly.', NOW() - INTERVAL '8 days', NULL),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Priya, hows the mobile sidebar?', NOW() - INTERVAL '7 days', NULL),
    (gen_random_uuid(), v_project_id, v_priya_id::text, 'Working on the responsive breakpoints.', NOW() - INTERVAL '6 days 23 hours', '{"name":"mobile_mock.jpg", "type":"image", "url":"https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=800", "size":"0.8MB"}'),
    (gen_random_uuid(), v_project_id, v_felvin_id::text, 'Just found a major perf bottleneck in the feed.', NOW() - INTERVAL '6 days', NULL),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Felvin, can you post the profiling results?', NOW() - INTERVAL '5 days 23 hours', NULL),
    (gen_random_uuid(), v_project_id, v_felvin_id::text, 'Here it is. React re-renders everywhere.', NOW() - INTERVAL '5 days', '{"name":"perf_audit.pdf", "type":"document", "url":"#", "size":"0.5MB"}'),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Fixing the Memory Leak on Task 11.', NOW() - INTERVAL '4 days 12 hours', NULL),
    (gen_random_uuid(), v_project_id, v_jishnu_id::text, 'Charts are alive!', NOW() - INTERVAL '4 days', '{"name":"dashboard_live.png", "type":"image", "url":"https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800", "size":"1.5MB"}'),
    (gen_random_uuid(), v_project_id, v_manager_id::text, 'Amazing work guys!', NOW() - INTERVAL '3 days 23 hours', NULL),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Pushing to staging for final review.', NOW() - INTERVAL '3 days', NULL),
    (gen_random_uuid(), v_project_id, v_priya_id::text, 'Mobile navigation fix deployed.', NOW() - INTERVAL '2 days 20 hours', NULL),
    (gen_random_uuid(), v_project_id, v_milan_id::text, 'Removed the legacy icons.', NOW() - INTERVAL '2 days 10 hours', NULL),
    (gen_random_uuid(), v_project_id, v_felvin_id::text, 'Profiling v2 looks much better.', NOW() - INTERVAL '2 days', '{"name":"perf_gain.jpg", "type":"image", "url":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800", "size":"0.7MB"}'),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Great job Felvin.', NOW() - INTERVAL '1 day 12 hours', NULL),
    (gen_random_uuid(), v_project_id, v_manager_id::text, 'Sneha: Security sweep completed.', NOW() - INTERVAL '1 day', '{"name":"sec_audit.png", "type":"image", "url":"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800", "size":"1.2MB"}'),
    (gen_random_uuid(), v_project_id, v_jishnu_id::text, 'Ready for production push?', NOW() - INTERVAL '18 hours', NULL),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Lets do it. v1.0.0 tagged.', NOW() - INTERVAL '12 hours', NULL),
    (gen_random_uuid(), v_project_id, v_manager_id::text, 'Production is healthy.', NOW() - INTERVAL '10 hours', NULL),
    (gen_random_uuid(), v_project_id, v_priya_id::text, 'Working on v1.1 alpha icons.', NOW() - INTERVAL '8 hours', '{"name":"icons_v1.1.png", "type":"image", "url":"https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800", "size":"0.4MB"}'),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Focusing on Task 3 refactor.', NOW() - INTERVAL '6 hours', NULL),
    (gen_random_uuid(), v_project_id, v_felvin_id::text, 'Rate limiting docs updated.', NOW() - INTERVAL '5 hours', NULL),
    (gen_random_uuid(), v_project_id, v_jishnu_id::text, 'Workflow stats updated.', NOW() - INTERVAL '4 hours', NULL),
    (gen_random_uuid(), v_project_id, v_milan_id::text, 'Milan: Standing by for cleanup.', NOW() - INTERVAL '3 hours', NULL),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Andrew: Almost done with Context refactor.', NOW() - INTERVAL '2 hours', NULL),
    (gen_random_uuid(), v_project_id, v_manager_id::text, 'Final retro form is out.', NOW() - INTERVAL '1 hour', NULL),
    (gen_random_uuid(), v_project_id, v_admin_id::text, 'Got it. Submitted my responses.', NOW() - INTERVAL '30 minutes', NULL);

    -- 8. DEPLOYMENTS (Prod v1, Stage, Alpha)
    INSERT INTO deployments (id, project_id, version, environment, status, release_notes, created_by, created_at) VALUES
    (v_dep_prod, v_project_id, 'v1.0.0', 'Production', 'Completed', 'Initial stable release.', v_admin_id, NOW() - INTERVAL '1 day'),
    (v_dep_stg, v_project_id, 'v1.1.0-rc1', 'Staging', 'Completed', 'RC for UI improvements.', v_manager_id, NOW() - INTERVAL '3 days'),
    (v_dep_dev, v_project_id, 'v1.1.0-alpha', 'Development', 'In Progress', 'Experimental alpha.', v_admin_id, NOW() - INTERVAL '5 days');

    INSERT INTO deployment_tasks (deployment_id, task_id, linked_at) VALUES
    (v_dep_prod, v_tasks[1], NOW()), (v_dep_prod, v_tasks[2], NOW()), (v_dep_prod, v_tasks[6], NOW()),
    (v_dep_stg, v_tasks[3], NOW()), (v_dep_stg, v_tasks[5], NOW());

    -- 9. SPECIALIZED FORMS (2 Questions each, Creator != Respondent)
    -- Retro by Andrew (Admin)
    INSERT INTO forms (id, project_id, title, description, fields, status, created_by) VALUES
    (v_form_retro, v_project_id, 'Sprint Retro (v1.0)', 'Reflection on the first major release.', 
    '[{"id":"q1","type":"rating","label":"Process Quality?","required":true,"rateMin":1,"rateMax":5}, 
      {"id":"q2","type":"comment","label":"What went well?","required":true}]'::JSONB, 
    'active', v_admin_id::text);

    -- Security by Sneha (Manager)
    INSERT INTO forms (id, project_id, title, description, fields, status, created_by) VALUES
    (v_form_security, v_project_id, 'Security Checklist', 'Mandatory audit for new features.', 
    '[{"id":"s1","type":"checkbox","label":"RLS Active?","choices":["Yes","No"]}, 
      {"id":"s2","type":"text","label":"Token used?"}]'::JSONB, 
    'active', v_manager_id::text);

    -- RESPONSES (All members respond to form created by others)
    -- Retro (Admin Created) -> Everyone else responds (5 total)
    INSERT INTO form_responses (id, form_id, respondent_id, answers, submitted_at) VALUES
    (gen_random_uuid(), v_form_retro, v_jishnu_id::text, '{"q1": 4, "q2": "Team agility was great"}'::JSONB, NOW() - INTERVAL '10 hours'),
    (gen_random_uuid(), v_form_retro, v_felvin_id::text, '{"q1": 5, "q2": "Postgres migration was seamless"}'::JSONB, NOW() - INTERVAL '9 hours'),
    (gen_random_uuid(), v_form_retro, v_manager_id::text, '{"q1": 4, "q2": "Clear communication"}'::JSONB, NOW() - INTERVAL '8 hours'),
    (gen_random_uuid(), v_form_retro, v_milan_id::text, '{"q1": 3, "q2": "Documentation needs work"}'::JSONB, NOW() - INTERVAL '7 hours'),
    (gen_random_uuid(), v_form_retro, v_priya_id::text, '{"q1": 4, "q2": "Good UI feedback loop"}'::JSONB, NOW() - INTERVAL '6 hours');

    -- Security (Manager Created) -> Everyone else responds (5 total)
    INSERT INTO form_responses (id, form_id, respondent_id, answers, submitted_at) VALUES
    (gen_random_uuid(), v_form_security, v_admin_id::text, '{"s1": ["Yes"], "s2": "Verified with JWT"}'::JSONB, NOW() - INTERVAL '5 hours'),
    (gen_random_uuid(), v_form_security, v_jishnu_id::text, '{"s1": ["Yes"], "s2": "Token rotation active"}'::JSONB, NOW() - INTERVAL '4 hours'),
    (gen_random_uuid(), v_form_security, v_felvin_id::text, '{"s1": ["Yes"], "s2": "Standard token"}'::JSONB, NOW() - INTERVAL '3 hours'),
    (gen_random_uuid(), v_form_security, v_milan_id::text, '{"s1": ["No"], "s2": "Internal only"}'::JSONB, NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), v_form_security, v_priya_id::text, '{"s1": ["Yes"], "s2": "N/A"}'::JSONB, NOW() - INTERVAL '1 hour');

END $$;
