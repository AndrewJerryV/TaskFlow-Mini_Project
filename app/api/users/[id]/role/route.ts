import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const requestUserId = searchParams.get('userId');

        if (!requestUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseForRequest(request);
        const { data: requestUser } = await supabase.from('users').select('id, role').eq('id', requestUserId).maybeSingle();
        if (!requestUser || requestUser.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden. Only Admins can change roles.' }, { status: 403 });
        }

        const body = await request.json();
        const { role } = body;

        if (!role || !['Admin', 'Manager', 'Member'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const resolvedParams = await params;
        const { data: targetUser } = await supabase.from('users').select('id, role').eq('id', resolvedParams.id).maybeSingle();
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent admin from removing their own admin status if they are the only admin
        if (targetUser.id === requestUserId && role !== 'Admin') {
            const { data: admins } = await supabase.from('users').select('id').eq('role', 'Admin');
            const adminCount = (admins || []).length;
            if (adminCount <= 1) {
                return NextResponse.json({ error: 'Cannot demote the last remaining Admin' }, { status: 400 });
            }
        }

        const { error: updateError } = await supabase.from('users').update({ role }).eq('id', resolvedParams.id);
        if (updateError) {
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, newRole: role });
    } catch (error) {
        console.error('Error in PATCH /api/users/[id]/role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
