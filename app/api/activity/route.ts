import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const logs = await db.getActivityLogs();
        return NextResponse.json(logs);
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch activity' }, { status: 500 });
    }
}
