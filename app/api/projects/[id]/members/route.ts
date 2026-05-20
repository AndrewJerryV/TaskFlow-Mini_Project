import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendProjectMemberAdded, sendProjectMemberRemoved } from '@/lib/email';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const projectId = (await params).id;
        const supabase = getSupabaseForRequest(request);
        const { data: membership } = await supabase.from('project_members').select('user_id').eq('project_id', projectId);
        return NextResponse.json((membership || []).map((m: any) => m.user_id));
    } catch (error) {
        console.error('Error fetching project members:', error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const projectId = (await params).id;
        const { userIds, requestUserId } = await request.json();
        const supabase = getSupabaseForRequest(request);

        console.log(`Updating members for project ${projectId}. New list:`, userIds);

        if (!requestUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: requestUser } = await supabase.from('users').select('id, name, role').eq('id', requestUserId).maybeSingle();
        if (!requestUser || (requestUser.role !== 'Admin' && requestUser.role !== 'Manager')) {
            return NextResponse.json({ error: 'Forbidden. Only Admins and Managers can add members.' }, { status: 403 });
        }

        if (!Array.isArray(userIds)) {
            return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 });
        }

        // Get current members
        const { data: currentMembersData } = await supabase.from('project_members').select('user_id').eq('project_id', projectId);
        const currentMembers = (currentMembersData || []).map((m: any) => m.user_id as string);
        console.log(`Current members for project ${projectId}:`, currentMembers);

        // Get project to check owner
        const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
        if (!project) {
            console.error(`Project ${projectId} not found during member update`);
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        const ownerId = project.owner_id;
        console.log(`Project owner for ${projectId}: ${ownerId}`);

        // 1. Members to add (those in userIds but not in currentMembers)
        const toAdd = userIds.filter((id: string) => !currentMembers.includes(id));
        for (const userId of toAdd) {
            console.log(`Adding member ${userId} to project ${projectId}`);
            await supabase.from('project_members').insert({ project_id: projectId, user_id: userId }).single();
            try {
                const { data: user } = await supabase.from('users').select('id, name, email').eq('id', userId).maybeSingle();
                if (user && user.email) {
                    const addedByName = (requestUser as any)?.name || 'Someone';
                    const projectLink = `/projects/${projectId}`;
                    await sendProjectMemberAdded(user.email, project.name, addedByName, projectLink).catch(e => console.error('Email error (add):', e));
                }
            } catch (err) {
                console.error('Error while sending added notification:', err);
            }
        }

        // 2. Members to remove (those in currentMembers but not in userIds, excluding owner)
        const toRemove = currentMembers.filter((id: string) => !userIds.includes(id) && id !== ownerId);
        for (const userId of toRemove) {
            console.log(`Removing member ${userId} from project ${projectId}`);
            await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);

            // Unassign tasks and notify admins/managers
            try {
                const { data: unassigned } = await supabase.from('tasks').update({ assignee_id: null }).eq('project_id', projectId).eq('assignee_id', userId).select();
                const unassignedCount = (unassigned || []).length;
                if (unassignedCount > 0) {
                    const { data: adminsAndManagers } = await getSupabaseAdmin().from('project_members').select('user_id, role').eq('project_id', projectId);
                    const { data: removedUser } = await supabase.from('users').select('id, name').eq('id', userId).maybeSingle();

                    for (const admin of (adminsAndManagers || [])) {
                        await supabase.from('notifications').insert({
                            user_id: admin.user_id,
                            type: 'general',
                            title: 'Tasks Unassigned',
                            message: `${unassignedCount} tasks were unassigned because ${removedUser?.name || 'a member'} was removed from ${project.name}.`,
                            project_id: projectId,
                            link: `/projects/${projectId}`
                        });
                    }
                }
            } catch (err) {
                console.error('Error during task unassignment/notification:', err);
            }

            try {
                const { data: user } = await supabase.from('users').select('id, name, email').eq('id', userId).maybeSingle();
                if (user && user.email) {
                    const removedByName = (requestUser as any)?.name || 'Someone';
                    await sendProjectMemberRemoved(user.email, project.name, removedByName).catch(e => console.error('Email error (remove):', e));
                }
            } catch (err) {
                console.error('Error while sending removed notification:', err);
            }
        }

        // 3. Ensure owner is always in project_members (safety check)
        if (!currentMembers.includes(ownerId) && !userIds.includes(ownerId)) {
            console.log(`Ensuring owner ${ownerId} is added back to project ${projectId}`);
            await supabase.from('project_members').insert({ project_id: projectId, user_id: ownerId, role: 'Owner' }).single();
        }

        // Return the fresh list
        const { data: updatedMembersData } = await supabase.from('project_members').select('user_id').eq('project_id', projectId);
        const updatedMembers = (updatedMembersData || []).map((m: any) => m.user_id);
        console.log(`Updated members for project ${projectId}:`, updatedMembers);
        return NextResponse.json(updatedMembers);
    } catch (error) {
        console.error('Fatal error in members POST handler:', error);
        return NextResponse.json({
            error: 'Failed to update members',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
