import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    const logs = db.getActivityLogs();
    return NextResponse.json(logs);
}
