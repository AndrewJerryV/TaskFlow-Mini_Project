import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

// In Next.js 15+, params is a Promise
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const userId = id;

        const supabase = getSupabaseForRequest(request);

        const tasksPromise = supabase
            .from('tasks')
            .select('*')
            .eq('assignee_id', userId)
            .order('created_at', { ascending: false });

        const logsPromise = supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        const [{ data: tasksData }, { data: logsData }] = await Promise.all([tasksPromise, logsPromise]);

        const tasks = (tasksData || []).map((dbTask: any) => ({
            id: dbTask.id,
            projectId: dbTask.project_id,
            title: dbTask.title,
            description: dbTask.description,
            status: dbTask.status,
            priority: dbTask.priority,
            assigneeId: dbTask.assignee_id,
            dueDate: dbTask.due_date,
            startDate: dbTask.start_date,
            createdAt: dbTask.created_at,
            updatedAt: dbTask.updated_at,
            tags: dbTask.tags || [],
            dependencies: dbTask.dependencies || [],
        }));

        const logs = (logsData || []).map((dbLog: any) => ({
            id: dbLog.id,
            entityType: dbLog.entity_type,
            entityId: dbLog.entity_id,
            action: dbLog.action,
            details: dbLog.details || '',
            userId: dbLog.user_id,
            timestamp: dbLog.timestamp,
        }));

        return NextResponse.json({ tasks, logs });
    } catch (error) {
        console.error('Error fetching user history:', error);
        return NextResponse.json({ error: 'Failed to fetch user history' }, { status: 500 });
    }
}
