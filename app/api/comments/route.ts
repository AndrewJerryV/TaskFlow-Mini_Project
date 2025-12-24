import { db } from '@/lib/db';
import { Comment } from '@/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const comments = await db.getComments(taskId);
        return NextResponse.json(comments);
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

        await db.addComment(newComment);
        return NextResponse.json(newComment);
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create comment' }, { status: 500 });
    }
}
