
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fawhdeawrihomivctrnw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function populateSkillExperience() {
    console.log('Fetching users...');
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, name, skills');

    if (fetchError) {
        console.error('Error fetching users:', fetchError);
        return;
    }

    console.log(`Found ${users.length} users. Populating experience...`);

    for (const user of users) {
        if (!user.skills || user.skills.length === 0) {
            console.log(`Skipping ${user.name} (no skills)`);
            continue;
        }

        const skillExperience = {};
        user.skills.forEach(skill => {
            // Assign a random experience between 1 and 12 years
            skillExperience[skill] = Math.floor(Math.random() * 12) + 1;
        });

        console.log(`Updating ${user.name} with:`, skillExperience);

        const { error: updateError } = await supabase
            .from('users')
            .update({ skill_experience: skillExperience })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Error updating user ${user.name}:`, updateError);
        }
    }

    console.log('Skill experience population complete!');
}

populateSkillExperience();
