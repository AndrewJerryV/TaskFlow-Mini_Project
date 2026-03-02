import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/meeting?projectId=...
export async function GET(request: NextRequest) {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const meetingUrl = await db.getMeetingUrl(projectId);
    return NextResponse.json({ meetingUrl });
}

// POST /api/meeting - Set or update the meeting URL
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        const success = await db.setMeetingUrl(body.projectId, body.meetingUrl || null);
        if (!success) {
            return NextResponse.json({ error: 'Failed to update meeting URL' }, { status: 500 });
        }

        return NextResponse.json({ success: true, meetingUrl: body.meetingUrl || null });
    } catch (error) {
        console.error('Error updating meeting URL:', error);
        return NextResponse.json({ error: 'Failed to update meeting URL' }, { status: 500 });
    }
}
