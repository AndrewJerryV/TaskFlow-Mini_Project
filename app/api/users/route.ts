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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const user = await db.addUser({
            fullName: body.fullName,
            email: body.email,
            password: body.password || 'TaskFlow@123',
            role: body.role,
            dob: body.dob || undefined,
            skillExperience: body.skillExperience,
            maxWorkload: body.maxWorkload || 5,
        });
        return NextResponse.json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create user' },
            { status: 500 }
        );
    }
}
