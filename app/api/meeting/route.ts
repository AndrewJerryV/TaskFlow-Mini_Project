import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: NextRequest) {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    const supabase = getSupabaseForRequest(request);
    const { data, error } = await supabase.from('settings').select('meeting_url').eq('project_id', projectId).maybeSingle();
    if (error) {
        console.error('Error fetching meeting URL:', error);
        return NextResponse.json({ meetingUrl: null }, { status: 200 });
    }
    return NextResponse.json({ meetingUrl: data?.meeting_url || null });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.projectId)
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        const supabase = getSupabaseForRequest(request);
        const { error } = await supabase.from('settings').upsert({ project_id: body.projectId, meeting_url: body.meetingUrl || null });
        if (error) return NextResponse.json({ error: 'Failed to update meeting URL' }, { status: 500 });
        return NextResponse.json({ success: true, meetingUrl: body.meetingUrl || null });
    } catch (error) {
        console.error('Error updating meeting URL:', error);
        return NextResponse.json({ error: 'Failed to update meeting URL' }, { status: 500 });
    }
}
