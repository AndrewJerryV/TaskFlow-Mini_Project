import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = getSupabaseForRequest(request);
        const { data: task } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Also get comments for this task
        const { data: comments = [] } = await supabase.from('comments').select('*').eq('task_id', id);

        return NextResponse.json({ ...task, comments });
    } catch (error) {
        console.error('Error fetching task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch task' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || 'system';
        const supabase = getSupabaseForRequest(request);

        const { error } = await supabase.from('tasks').delete().eq('id', id);
        const success = !error;

        if (!success) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete task' }, { status: 500 });
    }
}
