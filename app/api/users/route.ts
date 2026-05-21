import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseForRequest(request);
        const { data: users, error } = await supabase.from('users').select('*');
        if (error) {
            console.error('Error fetching users:', error);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }
        return NextResponse.json(users || []);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const supabase = getSupabaseForRequest(req);
        const newUser = {
            id: crypto.randomUUID(),
            name: body.fullName,
            email: body.email,
            password: body.password || 'TaskFlow@123',
            role: body.role,
            dob: body.dob || null,
            skill_experience: body.skillExperience || {},
            max_workload: body.maxWorkload || 5,
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('users').insert(newUser);
        if (error) {
            console.error('Error creating user:', error);
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        return NextResponse.json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create user' },
            { status: 500 }
        );
    }
}
