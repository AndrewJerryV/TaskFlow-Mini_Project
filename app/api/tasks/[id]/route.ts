import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const task = await db.getTaskById(id);

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Also get comments for this task
        const comments = await db.getComments(id);

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

        const success = await db.deleteTask(id, userId);

        if (!success) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete task' }, { status: 500 });
    }
}
