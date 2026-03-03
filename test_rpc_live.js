const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRPC() {
    try {
        console.log('Testing RPC call...');
        const payload = {
            p_email: `test_creation_${Date.now()}@example.com`,
            p_password: 'TaskFlow@123',
            p_full_name: 'Test Setup 3',
            p_user_role: 'Member',
            p_skills: [],
            p_dob: '1990-01-01',
            p_skill_experience: {},
            p_max_workload: 5
        };
        console.log('Payload:', payload);
        const { data, error } = await supabase.rpc('admin_create_user', payload);
        console.log('RPC Response:', { data, error });

        if (error) {
            console.log('Trying with p_name and p_age...');
            const altPayload = {
                p_email: `test_creation_alt_${Date.now()}@example.com`,
                p_password: 'TaskFlow@123',
                p_name: 'Test Setup 3',
                p_user_role: 'Member',
                p_skills: [],
                p_age: 30,
                p_skill_experience: {},
                p_max_workload: 5
            };
            const altRes = await supabase.rpc('admin_create_user', altPayload);
            console.log('Alt RPC Response:', altRes);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

testRPC();
