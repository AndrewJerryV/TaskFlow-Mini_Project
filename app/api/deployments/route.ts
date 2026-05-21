import { Deployment } from '@/types';
import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const taskId = searchParams.get('taskId');

        const supabase = getSupabaseForRequest(request);
        if (taskId) {
            const { data } = await supabase.from('deployments').select('*').eq('task_id', taskId);
            return NextResponse.json(data || []);
        }

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID or Task ID is required' }, { status: 400 });
        }

        const { data } = await supabase.from('deployments').select('*').eq('project_id', projectId);
        return NextResponse.json(data || []);
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

        const supabase2 = getSupabaseForRequest(request);
        const { data: requestUser } = await supabase2.from('users').select('id, role').eq('id', requestUserId).maybeSingle();
        if (!requestUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Only Admins and Managers can create deployments
        if (requestUser.role === 'Member') return NextResponse.json({ error: 'Only Admins and Managers can create deployments' }, { status: 403 });

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

        const { error: insertErr } = await supabase2.from('deployments').insert({
            id: newDeployment.id,
            project_id: newDeployment.projectId,
            version: newDeployment.version,
            environment: newDeployment.environment,
            status: newDeployment.status,
            release_notes: newDeployment.releaseNotes,
            created_by: newDeployment.createdBy,
            created_at: newDeployment.createdAt,
            updated_at: newDeployment.updatedAt
        });

        if (insertErr) return NextResponse.json({ error: 'Failed to create deployment in database' }, { status: 500 });

        // link tasks if provided
        if (taskIds.length) {
            for (const tid of taskIds) {
                await supabase2.from('deployment_tasks').insert({ deployment_id: newDeployment.id, task_id: tid });
            }
        }

        return NextResponse.json(newDeployment);
    } catch (error) {
        console.error('Error creating deployment:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create deployment' }, { status: 500 });
    }
}
