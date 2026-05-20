import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const supabase = getSupabaseForRequest(request);
        const { data: dbUser, error } = await supabase
            .from('users')
            .update({
                phone: body.phone,
                office_address: body.officeAddress,
                quiet_hours_start: body.quietHoursStart,
                quiet_hours_end: body.quietHoursEnd,
                quiet_hours_weekends: body.quietHoursWeekends,
                two_factor_enabled: body.twoFactorEnabled,
                max_workload: body.maxWorkload,
                burnout_sensitivity: body.burnoutSensitivity,
                auto_assign: body.autoAssign,
                skill_match_priority: body.skillMatchPriority,
                ai_deadlines: body.aiDeadlines,
                dob: body.dob,
                company_size: body.companySize,
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error || !dbUser) {
            return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
        }

        const user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url,
            role: dbUser.role,
            createdAt: dbUser.created_at,
            dob: dbUser.dob,
            skillExperience: typeof dbUser.skill_experience === 'string' ? JSON.parse(dbUser.skill_experience) : dbUser.skill_experience,
            skills: dbUser.skills || [],
            wellnessScore: dbUser.wellness_score ?? 85,
            maxWorkload: dbUser.max_workload ?? 5,
            burnoutRisk: 'Low',
            phone: dbUser.phone,
            officeAddress: dbUser.office_address,
            age: dbUser.age,
            quietHoursStart: dbUser.quiet_hours_start,
            quietHoursEnd: dbUser.quiet_hours_end,
            quietHoursWeekends: dbUser.quiet_hours_weekends,
            twoFactorEnabled: dbUser.two_factor_enabled,
            companySize: dbUser.company_size,
            burnoutSensitivity: dbUser.burnout_sensitivity,
            autoAssign: dbUser.auto_assign,
            skillMatchPriority: dbUser.skill_match_priority,
            aiDeadlines: dbUser.ai_deadlines,
        };

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error updating user settings:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update settings' },
            { status: 500 }
        );
    }
}
