import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');
        const userId = searchParams.get('userId');

        const supabase = getSupabaseForRequest(request);
        if (taskId) {
            const { data: entries = [] } = await supabase.from('time_entries').select('*').eq('task_id', taskId);
            return NextResponse.json(entries);
        }

        if (userId) {
            const { data: active = [] } = await supabase.from('time_entries').select('*').eq('user_id', userId).eq('stopped', false);
            return NextResponse.json(active);
        }

        return NextResponse.json({ error: 'taskId or userId is required' }, { status: 400 });
    } catch (error) {
        console.error('Error fetching time entries:', error);
        return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { taskId, userId, projectId } = body;

        if (!taskId || !userId) {
            return NextResponse.json({ error: 'taskId and userId are required' }, { status: 400 });
        }

        const supabase = getSupabaseForRequest(request);
        const { data: newEntry, error } = await supabase.from('time_entries').insert({ task_id: taskId, user_id: userId, project_id: projectId, started_at: new Date().toISOString(), stopped: false }).select().maybeSingle();
        if (error || !newEntry) {
            return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 });
        }

        return NextResponse.json(newEntry);
    } catch (error) {
        console.error('Error starting time entry:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, note, userId, taskId } = body;

        if (!id && !userId) {
            return NextResponse.json({ error: 'id or userId is required' }, { status: 400 });
        }

        if (userId) {
            const supabase = getSupabaseForRequest(request);
            const stopNote = note || 'Logged via TaskFlow Timer';
            const { data: stoppedEntries = [], error: stopError } = await supabase.from('time_entries').update({ stopped: true, note: stopNote, stopped_at: new Date().toISOString() }).eq('user_id', userId).eq('stopped', false).select();

            const stoppedEntriesArr = stoppedEntries || [];

            // Fallback for stale/mismatched filters: if a direct id was provided, attempt it too.
            if (stoppedEntriesArr.length === 0 && id) {
                const { data: updatedEntry } = await supabase.from('time_entries').update({ stopped: true, note: stopNote, stopped_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
                if (updatedEntry) {
                    return NextResponse.json(updatedEntry);
                }
            }

            return NextResponse.json({
                stoppedCount: stoppedEntriesArr.length,
                entries: stoppedEntriesArr,
            });
        }

        const supabase = getSupabaseForRequest(request);
        const { data: updatedEntry, error: finalError } = await supabase.from('time_entries').update({ stopped: true, note, stopped_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
        if (finalError || !updatedEntry) {
            return NextResponse.json({ error: 'Failed to stop timer' }, { status: 500 });
        }

        return NextResponse.json(updatedEntry);
    } catch (error) {
        console.error('Error stopping time entry:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
