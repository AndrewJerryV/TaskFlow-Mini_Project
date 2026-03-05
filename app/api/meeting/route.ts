import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    return NextResponse.json({ meetingUrl: await db.getMeetingUrl(projectId) });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.projectId)
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        const success = await db.setMeetingUrl(body.projectId, body.meetingUrl || null);
        if (!success)
            return NextResponse.json({ error: 'Failed to update meeting URL' }, { status: 500 });
        return NextResponse.json({ success: true, meetingUrl: body.meetingUrl || null });
    } catch (error) {
        console.error('Error updating meeting URL:', error);
        return NextResponse.json({ error: 'Failed to update meeting URL' }, { status: 500 });
    }
}
