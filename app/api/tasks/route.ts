import { db } from '@/lib/db';
import { Task } from '@/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const userId = searchParams.get('userId'); // Needed for visibility checks

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
        }

        const user = await db.getUser(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Visibility check: If user is not Admin, check project membership
        if (projectId && user.role !== 'Admin') {
            const userProjects = await db.getProjects(userId);
            const isMember = userProjects.some(p => p.id === projectId);
            if (!isMember) {
                return NextResponse.json({ error: 'Access denied: You are not a member of this project' }, { status: 403 });
            }
        }

        let tasks = await db.getTasks(projectId || undefined);

        // RBAC: Members cannot see private tasks they aren't assigned to
        if (user.role === 'Member') {
            tasks = tasks.filter((t: Task) => !t.isPrivate || t.assigneeId === userId);
        }

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const requestUserId = searchParams.get('userId');

        if (!requestUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const requestUser = await db.getUser(requestUserId);
        if (!requestUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (!body.title || !body.projectId) {
            return NextResponse.json({ error: 'Title and Project ID are required' }, { status: 400 });
        }

        // RBAC: Members can only create tasks assigned to themselves or unassigned, and they cannot create private tasks
        if (requestUser.role === 'Member') {
            if (body.assigneeId && body.assigneeId !== requestUser.id) {
                return NextResponse.json({ error: 'Members can only assign tasks to themselves' }, { status: 403 });
            }
            if (body.isPrivate) {
                return NextResponse.json({ error: 'Members cannot create private tasks' }, { status: 403 });
            }
        }

        const newTask: Task = {
            id: crypto.randomUUID(),
            projectId: body.projectId,
            title: body.title,
            description: body.description || '',
            status: 'To Do',
            priority: body.priority || 'Medium',
            assigneeId: body.assigneeId,
            dueDate: body.dueDate,
            startDate: body.startDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: body.tags || [],
            isPrivate: body.isPrivate || false,
            dependencies: body.dependencies || [],
            timeLogs: []
        };

        await db.addTask(newTask);
        return NextResponse.json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create task' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, userId, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
        }

        const requestUser = await db.getUser(userId);
        if (!requestUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const existingTask = await db.getTaskById(id);
        if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        // RBAC constraints for Members
        if (requestUser.role === 'Member') {
            if (existingTask.assigneeId !== requestUser.id) {
                return NextResponse.json({ error: 'Members can only update their own tasks' }, { status: 403 });
            }

            // Lock down metadata edits
            const restrictedFields = ['title', 'description', 'priority', 'dueDate', 'isPrivate', 'dependencies', 'assigneeId'];
            const attemptRestrictedEdit = restrictedFields.some(field => field in updates);

            if (attemptRestrictedEdit) {
                return NextResponse.json({ error: 'Members cannot edit task metadata (title, priority, due date, etc.)' }, { status: 403 });
            }
        }

        // Validate state transitions
        if (updates.status && updates.status !== existingTask.status && requestUser.role !== 'Admin') {
            const validTransitions: Record<string, string[]> = {
                'To Do': ['In Progress'],
                'In Progress': ['Review'],
                'Review': ['Done', 'In Progress'],
                'Done': ['In Progress']
            };

            const allowedNextStates = validTransitions[existingTask.status] || [];
            if (!allowedNextStates.includes(updates.status)) {
                return NextResponse.json({ error: `Invalid transition from ${existingTask.status} to ${updates.status}` }, { status: 400 });
            }

            // Dependency checks when moving to Done or Review
            if (updates.status === 'Review' || updates.status === 'Done') {
                if (existingTask.dependencies && existingTask.dependencies.length > 0) {
                    const tasks = await db.getTasks(existingTask.projectId); // Simplified, assume in same project
                    const blockingTasks = tasks.filter(t => existingTask.dependencies!.includes(t.id) && t.status !== 'Done');

                    if (blockingTasks.length > 0) {
                        return NextResponse.json({ error: 'Cannot transition task because dependencies are not Done' }, { status: 400 });
                    }
                }
            }
        }

        const updatedTask = await db.updateTask(id, { ...updates, updatedAt: new Date().toISOString() }, userId);

        if (!updatedTask) {
            return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
        }

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id || !userId) {
            return NextResponse.json({ error: 'Task ID and User ID are required' }, { status: 400 });
        }

        const requestUser = await db.getUser(userId);
        if (!requestUser || requestUser.role === 'Member') {
            return NextResponse.json({ error: 'Only Admins and Managers can delete tasks' }, { status: 403 });
        }

        const success = await db.deleteTask(id, userId);

        if (!success) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete task' }, { status: 500 });
    }
}
