import { db } from '@/lib/db';
import { Project } from '@/types';
import { NextResponse } from 'next/server';
import { sendProjectMemberAdded } from '@/lib/email';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const projects = await db.getProjects(userId || undefined);
        // Get tasks for all projects returned, without filtering by assigneeId for stats calculation
        const allTasks = await db.getTasks(undefined, undefined);

        // Enrich with stats
        const projectsWithStats = projects.map(p => {
            const tasks = allTasks.filter(t => t.projectId === p.id);
            const doneCount = tasks.filter(t => t.status === 'Done').length;
            const totalCount = tasks.length;
            const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

            return {
                ...p,
                stats: {
                    totalTasks: totalCount,
                    doneTasks: doneCount,
                    progress
                }
            };
        });

        return NextResponse.json(projectsWithStats);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.name || !body.key || !body.ownerId) {
            return NextResponse.json({ error: 'Name, Key, and Owner ID are required' }, { status: 400 });
        }

        const requestUser = await db.getUser(body.ownerId);
        if (!requestUser || (requestUser.role !== 'Admin' && requestUser.role !== 'Manager')) {
            return NextResponse.json({ error: 'Forbidden. Only Admins and Managers can create projects.' }, { status: 403 });
        }

        const newProject: Project = {
            id: crypto.randomUUID(),
            name: body.name,
            description: body.description || '',
            key: body.key,
            ownerId: body.ownerId, // Use provided ownerId
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await db.addProject(newProject);

        if (body.memberIds && Array.isArray(body.memberIds)) {
            for (const memberId of body.memberIds) {
                if (memberId !== body.ownerId) {
                    await db.addProjectMember(newProject.id, memberId);
                    try {
                        const user = await db.getUser(memberId);
                        if (user && user.email) {
                            const addedByName = requestUser?.name || 'Someone';
                            const projectLink = `/projects/${newProject.id}`;
                            await sendProjectMemberAdded(user.email, newProject.name, addedByName, projectLink).catch(e => console.error('Email error (initial add):', e));
                        }
                    } catch (err) {
                        console.error('Error sending initial member email:', err);
                    }
                }
            }
        }

        return NextResponse.json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create project' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requestUser = await db.getUser(userId);
        if (!requestUser || (requestUser.role !== 'Admin' && requestUser.role !== 'Manager')) {
            return NextResponse.json({ error: 'Forbidden. Only Admins and Managers can delete projects.' }, { status: 403 });
        }

        const success = await db.deleteProject(id);
        if (!success) {
            return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete project' }, { status: 500 });
    }
}
