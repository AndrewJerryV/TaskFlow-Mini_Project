import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendProjectMemberRemoved } from '@/lib/email';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    try {
        const { id: projectId, userId } = await params;

        const { searchParams } = new URL(request.url);
        const requestUserId = searchParams.get('requestUserId');

        if (!requestUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requestUser = await db.getUser(requestUserId);
        if (!requestUser || (requestUser.role !== 'Admin' && requestUser.role !== 'Manager')) {
            return NextResponse.json({ error: 'Forbidden. Only Admins and Managers can remove members.' }, { status: 403 });
        }

        const project = await db.getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (userId === project.ownerId) {
            return NextResponse.json({ error: 'Cannot remove the project owner.' }, { status: 400 });
        }

        await db.removeProjectMember(projectId, userId);

        try {
            const user = await db.getUser(userId);
            const project = await db.getProject(projectId);
            if (user && user.email && project) {
                const remover = requestUser?.name || 'Someone';
                await sendProjectMemberRemoved(user.email, project.name, remover).catch(e => console.error('Email error (remove single):', e));
            }
        } catch (err) {
            console.error('Error sending removal email:', err);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to remove member:', error);
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
