import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');
        const userId = searchParams.get('userId');

        if (taskId) {
            const entries = await db.getTimeEntries(taskId);
            return NextResponse.json(entries);
        }

        if (userId) {
            const active = await db.getActiveTimer(userId);
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

        const newEntry = await db.startTimeEntry(taskId, userId, projectId);
        if (!newEntry) {
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
        const { id, note } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const updatedEntry = await db.stopTimeEntry(id, note);
        if (!updatedEntry) {
            return NextResponse.json({ error: 'Failed to stop timer' }, { status: 500 });
        }

        return NextResponse.json(updatedEntry);
    } catch (error) {
        console.error('Error stopping time entry:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
