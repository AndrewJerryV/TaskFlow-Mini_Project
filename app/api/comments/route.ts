import { Comment } from '@/types';
import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const supabase = getSupabaseForRequest(request);
        const { data } = await supabase.from('comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch comments' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.taskId || !body.content) {
            return NextResponse.json({ error: 'Task ID and content are required' }, { status: 400 });
        }

        const newComment: Comment = {
            id: crypto.randomUUID(),
            taskId: body.taskId,
            userId: body.userId || 'system',
            content: body.content,
            createdAt: new Date().toISOString(),
        };

        const supabase2 = getSupabaseForRequest(request);
        const { error } = await supabase2.from('comments').insert({
            id: newComment.id,
            task_id: newComment.taskId,
            user_id: newComment.userId,
            content: newComment.content,
            created_at: newComment.createdAt
        });
        if (error) {
            console.error('Error inserting comment:', error);
            return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
        }
        return NextResponse.json(newComment);
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create comment' }, { status: 500 });
    }
}
