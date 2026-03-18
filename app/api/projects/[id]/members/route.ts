import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendProjectMemberAdded, sendProjectMemberRemoved } from '@/lib/email';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const projectId = (await params).id;
        const members = await db.getProjectMembers(projectId);
        return NextResponse.json(members);
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

        console.log(`Updating members for project ${projectId}. New list:`, userIds);

        if (!requestUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requestUser = await db.getUser(requestUserId);
        if (!requestUser || (requestUser.role !== 'Admin' && requestUser.role !== 'Manager')) {
            return NextResponse.json({ error: 'Forbidden. Only Admins and Managers can add members.' }, { status: 403 });
        }

        if (!Array.isArray(userIds)) {
            return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 });
        }

        // Get current members
        const currentMembers = await db.getProjectMembers(projectId);
        console.log(`Current members for project ${projectId}:`, currentMembers);

        // Get project to check owner
        const project = await db.getProject(projectId);
        if (!project) {
            console.error(`Project ${projectId} not found during member update`);
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        const ownerId = project.ownerId;
        console.log(`Project owner for ${projectId}: ${ownerId}`);

        // 1. Members to add (those in userIds but not in currentMembers)
        const toAdd = userIds.filter((id: string) => !currentMembers.includes(id));
        for (const userId of toAdd) {
            console.log(`Adding member ${userId} to project ${projectId}`);
            await db.addProjectMember(projectId, userId);
            try {
                const user = await db.getUser(userId);
                if (user && user.email) {
                    const addedByName = requestUser?.name || 'Someone';
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
            await db.removeProjectMember(projectId, userId);
            
            // Unassign tasks and notify admins/managers
            try {
                const unassignedCount = await db.unassignUserTasks(projectId, userId);
                if (unassignedCount > 0) {
                    const adminsAndManagers = await db.getProjectAdminsAndManagers(projectId);
                    const removedUser = await db.getUser(userId);
                    
                    for (const admin of adminsAndManagers) {
                        await db.addNotification({
                            userId: admin.id,
                            type: 'general',
                            title: 'Tasks Unassigned',
                            message: `${unassignedCount} tasks were unassigned because ${removedUser?.name || 'a member'} was removed from ${project.name}.`,
                            projectId: projectId,
                            link: `/projects/${projectId}`
                        });
                    }
                }
            } catch (err) {
                console.error('Error during task unassignment/notification:', err);
            }

            try {
                const user = await db.getUser(userId);
                if (user && user.email) {
                    const removedByName = requestUser?.name || 'Someone';
                    await sendProjectMemberRemoved(user.email, project.name, removedByName).catch(e => console.error('Email error (remove):', e));
                }
            } catch (err) {
                console.error('Error while sending removed notification:', err);
            }
        }

        // 3. Ensure owner is always in project_members (safety check)
        if (!currentMembers.includes(ownerId) && !userIds.includes(ownerId)) {
            console.log(`Ensuring owner ${ownerId} is added back to project ${projectId}`);
            await db.addProjectMember(projectId, ownerId, 'Owner');
        }

        // Return the fresh list
        const updatedMembers = await db.getProjectMembers(projectId);
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
