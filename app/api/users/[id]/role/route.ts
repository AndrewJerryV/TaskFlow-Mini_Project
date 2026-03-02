import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

        const requestUser = await db.getUser(requestUserId);
        if (!requestUser || requestUser.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden. Only Admins can change roles.' }, { status: 403 });
        }

        const body = await request.json();
        const { role } = body;

        if (!role || !['Admin', 'Manager', 'Member'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const resolvedParams = await params;
        const targetUser = await db.getUser(resolvedParams.id);
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent admin from removing their own admin status if they are the only admin
        if (targetUser.id === requestUserId && role !== 'Admin') {
            const allUsers = await db.getUsers();
            const adminCount = allUsers.filter((u: any) => u.role === 'Admin').length;
            if (adminCount <= 1) {
                return NextResponse.json({ error: 'Cannot demote the last remaining Admin' }, { status: 400 });
            }
        }

        const success = await db.updateUserRole(resolvedParams.id, role);
        if (!success) {
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, newRole: role });
    } catch (error) {
        console.error('Error in PATCH /api/users/[id]/role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
