import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const users = await db.getUsers();
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch users' }, { status: 500 });
    }
}
