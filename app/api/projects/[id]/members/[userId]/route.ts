import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
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

        const supabase = getSupabaseForRequest(request);
        const { data: requestUser } = await supabase.from('users').select('id, name, role').eq('id', requestUserId).maybeSingle();
        if (!requestUser || (requestUser.role !== 'Admin' && requestUser.role !== 'Manager')) {
            return NextResponse.json({ error: 'Forbidden. Only Admins and Managers can remove members.' }, { status: 403 });
        }

        const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (userId === project.owner_id) {
            return NextResponse.json({ error: 'Cannot remove the project owner.' }, { status: 400 });
        }

        await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);

        try {
            const { data: user } = await supabase.from('users').select('id, name, email').eq('id', userId).maybeSingle();
            const { data: proj } = await supabase.from('projects').select('id, name').eq('id', projectId).maybeSingle();
            if (user && user.email && proj) {
                const remover = (requestUser as any)?.name || 'Someone';
                await sendProjectMemberRemoved(user.email, proj.name, remover).catch(e => console.error('Email error (remove single):', e));
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
