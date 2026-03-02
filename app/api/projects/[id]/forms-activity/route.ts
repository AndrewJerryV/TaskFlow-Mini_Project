import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    try {
        const count = await db.getProjectFormsActivity(projectId);
        return NextResponse.json({ count });
    } catch (error) {
        console.error('Error getting forms activity:', error);
        return NextResponse.json({ error: 'Failed to get forms activity' }, { status: 500 });
    }
}
