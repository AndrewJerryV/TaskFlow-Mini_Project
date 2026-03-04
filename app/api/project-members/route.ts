import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/project-members?projectId=...
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }
    // Get user IDs for this project
    const userIds = await db.getProjectMembers(projectId);
    // Get user details
    const allUsers = await db.getUsers();
    const users = allUsers.filter(u => userIds.includes(u.id));
    return NextResponse.json(users);
}
