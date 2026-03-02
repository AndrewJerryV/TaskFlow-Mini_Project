import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('forms').insert({
        id: crypto.randomUUID(),
        project_id: 'a1111111-1111-1111-1111-111111111111',
        title: 'Test Form Script',
        description: 'Testing',
        fields: '[]',
        status: 'active',
        created_by: '00000000-0000-0000-0000-000000000001'
    });
    console.log("Insert result:", { data, error });
}
test();
