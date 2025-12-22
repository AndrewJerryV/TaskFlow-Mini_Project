import { db } from '@/lib/db';
import { Task } from '@/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const tasks = await db.getTasks(projectId || undefined);
    return NextResponse.json(tasks);
}

export async function POST(request: Request) {
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: body.tags || [],
    };

    await db.addTask(newTask);
    return NextResponse.json(newTask);
}

export async function PATCH(request: Request) {
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
}
