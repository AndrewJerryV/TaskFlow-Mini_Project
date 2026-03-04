import { db } from '@/lib/db';
import { Deployment } from '@/types';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const taskId = searchParams.get('taskId');

        if (taskId) {
            const deployments = await db.getTaskDeployments(taskId);
            return NextResponse.json(deployments);
        }

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID or Task ID is required' }, { status: 400 });
        }

        const deployments = await db.getDeployments(projectId);
        return NextResponse.json(deployments);
    } catch (error) {
        console.error('Error fetching deployments:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch deployments' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const requestUserId = searchParams.get('userId') || body.userId;

        if (!requestUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const requestUser = await db.getUser(requestUserId);
        if (!requestUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Only Admins and Managers can create deployments
        if (requestUser.role === 'Member') {
            return NextResponse.json({ error: 'Only Admins and Managers can create deployments' }, { status: 403 });
        }

        if (!body.version || !body.environment || !body.status || !body.projectId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newDeployment: Deployment = {
            id: crypto.randomUUID(),
            projectId: body.projectId,
            version: body.version,
            environment: body.environment,
            status: body.status,
            releaseNotes: body.releaseNotes || '',
            createdBy: requestUserId as string,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const taskIds: string[] = body.taskIds || [];

        const created = await db.createDeployment(newDeployment, taskIds);

        if (!created) {
            return NextResponse.json({ error: 'Failed to create deployment in database' }, { status: 500 });
        }

        return NextResponse.json(newDeployment);
    } catch (error) {
        console.error('Error creating deployment:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create deployment' }, { status: 500 });
    }
}
