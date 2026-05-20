import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { skills, skillExperience } = body;

        if (!Array.isArray(skills) || !skillExperience) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const supabase = getSupabaseForRequest(request);
        const { error } = await supabase
            .from('users')
            .update({ skills, skill_experience: skillExperience })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: 'Failed to update skills', details: error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
