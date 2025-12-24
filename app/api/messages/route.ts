import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Message } from '@/types';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'ProjectId required' }, { status: 400 });
        }

        const messages = await db.getMessages(projectId);
        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Basic validation
        if (!body.projectId || !body.content) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const newMessage: Message = {
            id: crypto.randomUUID(),
            projectId: body.projectId,
            userId: body.userId || 'u1',
            content: body.content,
            timestamp: new Date().toISOString()
        };

        await db.addMessage(newMessage);
        return NextResponse.json(newMessage);
    } catch (error) {
        console.error('Error creating message:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create message' }, { status: 500 });
    }
}
