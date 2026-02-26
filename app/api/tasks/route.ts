import { db } from '@/lib/db';
import { Task } from '@/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        const tasks = await db.getTasks(projectId || undefined);
        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.title || !body.projectId) {
            return NextResponse.json({ error: 'Title and Project ID are required' }, { status: 400 });
        }

        const newTask: Task = {
            id: crypto.randomUUID(),
            projectId: body.projectId,
            title: body.title,
            description: body.description || '',
            status: 'To Do',
            priority: body.priority || 'Medium',
            assigneeId: body.assigneeId,
            dueDate: body.dueDate,
            startDate: body.startDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: body.tags || [],
        };

        await db.addTask(newTask);
        return NextResponse.json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create task' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const updatedTask = await db.updateTask(id, updates);

        if (!updatedTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId') || 'system';

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

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
