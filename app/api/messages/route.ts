import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Message } from '@/types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'ProjectId required' }, { status: 400 });
    }

    const messages = db.getMessages(projectId);
    return NextResponse.json(messages);
}

export async function POST(request: Request) {
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

    db.addMessage(newMessage);
    return NextResponse.json(newMessage);
}
