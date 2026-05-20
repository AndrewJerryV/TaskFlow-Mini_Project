import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

// GET /api/project-members?projectId=...
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }
    try {
        const supabase = getSupabaseForRequest(request);
        const { data: membershipData, error: memErr } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId);

        if (memErr) {
            console.warn('project-members: membership query error', memErr);
            return NextResponse.json([]);
        }

        const userIds = (membershipData || []).map((m: any) => m.user_id);
        if (userIds.length === 0) return NextResponse.json([]);

        const { data: users, error: usersErr } = await supabase
            .from('users')
            .select('*')
            .in('id', userIds);

        if (usersErr) {
            console.warn('project-members: users query error', usersErr);
            return NextResponse.json([]);
        }
        return NextResponse.json(users || []);
    } catch (err) {
        console.error('project-members: unexpected error', err);
        return NextResponse.json([]);
    }
}
