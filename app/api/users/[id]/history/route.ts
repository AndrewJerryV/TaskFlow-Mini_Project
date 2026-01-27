import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// In Next.js 15+, params is a Promise
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const userId = id;

        // Parallel fetch for speed
        const [tasks, logs] = await Promise.all([
            db.getTasks(undefined, userId),
            db.getUserActivityLogs(userId)
        ]);

        return NextResponse.json({
            tasks,
            logs
        });
    } catch (error) {
        console.error('Error fetching user history:', error);
        return NextResponse.json({ error: 'Failed to fetch user history' }, { status: 500 });
    }
}
