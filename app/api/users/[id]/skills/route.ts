import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { skills, skillExperience } = body;

        if (!Array.isArray(skills) || !skillExperience) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const { success, error } = await db.updateUserSkills(id, skills, skillExperience);

        if (!success) {
            return NextResponse.json({ error: 'Failed to update skills', details: error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
