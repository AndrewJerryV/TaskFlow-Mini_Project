
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const users = await db.getUsers();
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if user exists (simple check via fetching all - optimization: add getUserByEmail)
        // For now, we will just proceed with creating. Prisma unique constraint would throw if duplicate.

        // Create new user object
        const newUser = {
            id: crypto.randomUUID(),
            name: email.split('@')[0], // Derive name from email
            email: email,
            role: 'Member' as const, // Fix: Assert as specific literal type
            avatarUrl: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`,
            createdAt: new Date().toISOString()
        };

        await db.addUser(newUser);
        return NextResponse.json(newUser);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
