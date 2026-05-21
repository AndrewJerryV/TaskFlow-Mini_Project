import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        const supabase = getSupabaseForRequest(req);

        // 1. Fetch all relevant time entries (Source of truth)
        let query = supabase
            .from('time_entries')
            .select(`
                id,
                task_id,
                user_id,
                project_id,
                start_time,
                end_time,
                duration_minutes,
                note,
                created_at
            `);

        if (projectId) query = query.eq('project_id', projectId);
        if (userId) query = query.eq('user_id', userId);
        if (startDate) query = query.gte('start_time', startDate);
        if (endDate) query = query.lte('start_time', endDate + 'T23:59:59');

        const { data: entries, error: entriesError } = await query;
        if (entriesError) throw entriesError;

        // 2. Fetch Supporting Data for Mapping
        const [tasksRes, projectsRes, usersRes] = await Promise.all([
            supabase.from('tasks').select('id, title, status, priority, assignee_id, project_id'),
            supabase.from('projects').select('id, name, key'),
            supabase.from('users').select('id, name, email, avatar_url')
        ]);

        const taskMap = new Map((tasksRes.data || []).map(t => [t.id, t]));
        const projectMap = new Map((projectsRes.data || []).map(p => [p.id, p]));
        const userMap = new Map((usersRes.data || []).map(u => [u.id, u]));

        // 3. Process Entries
        interface AggregationEntry {
            taskId: string;
            taskTitle: string;
            projectId: string;
            projectName: string;
            assigneeId: string;
            userId: string;
            userName: string;
            minutes: number;
            date: string;
            isManual: boolean;
        }

        const allEntries: AggregationEntry[] = [];
        const activeTimers: any[] = [];
        let activeTimerCount = 0;

        for (const entry of (entries || [])) {
            const task = taskMap.get(entry.task_id);
            const project = projectMap.get(entry.project_id || task?.project_id);
            const user = userMap.get(entry.user_id);

            // If entry is finished, add to aggregates
            if (entry.end_time) {
                allEntries.push({
                    taskId: entry.task_id,
                    taskTitle: task?.title || 'Unknown Task',
                    projectId: entry.project_id || task?.project_id || '',
                    projectName: project?.name || 'Unknown Project',
                    assigneeId: task?.assignee_id || '',
                    userId: entry.user_id,
                    userName: user?.name || 'Unknown User',
                    minutes: entry.duration_minutes || 0,
                    date: entry.start_time,
                    isManual: entry.note === 'Manual log'
                });
            } else {
                // Timer is active
                activeTimerCount++;
                activeTimers.push({
                    id: entry.id,
                    taskId: entry.task_id,
                    taskTitle: task?.title || 'Unknown Task',
                    userId: entry.user_id,
                    userName: user?.name || 'Unknown User',
                    startedAt: entry.start_time,
                });
            }
        }

        // 4. Aggregate Tools (Matching existing API structure)
        
        // Per User
        const perUser: Record<string, any> = {};
        for (const e of allEntries) {
            if (!perUser[e.userId]) {
                perUser[e.userId] = { userId: e.userId, userName: e.userName, totalMinutes: 0, taskCount: 0, taskIds: new Set() };
            }
            perUser[e.userId].totalMinutes += e.minutes;
            perUser[e.userId].taskIds.add(e.taskId);
        }
        const perUserArray = Object.values(perUser).map(u => ({
            ...u,
            taskCount: u.taskIds.size,
            taskIds: undefined // cleanup
        }));

        // Per Task
        const perTask: Record<string, any> = {};
        for (const e of allEntries) {
            if (!perTask[e.taskId]) {
                const task = taskMap.get(e.taskId);
                perTask[e.taskId] = {
                    taskId: e.taskId,
                    taskTitle: e.taskTitle,
                    projectId: e.projectId,
                    projectName: e.projectName,
                    assigneeId: e.assigneeId,
                    assigneeName: userMap.get(e.assigneeId)?.name || 'Unassigned',
                    totalMinutes: 0,
                    lastEntry: e.date
                };
            }
            perTask[e.taskId].totalMinutes += e.minutes;
            if (e.date > perTask[e.taskId].lastEntry) perTask[e.taskId].lastEntry = e.date;
        }

        // Per Project
        const perProject: Record<string, any> = {};
        for (const e of allEntries) {
            if (!perProject[e.projectId]) {
                perProject[e.projectId] = { projectId: e.projectId, projectName: e.projectName, totalMinutes: 0, taskCount: 0, taskIds: new Set() };
            }
            perProject[e.projectId].totalMinutes += e.minutes;
            perProject[e.projectId].taskIds.add(e.taskId);
        }
        const perProjectArray = Object.values(perProject).map(p => ({
            ...p,
            taskCount: p.taskIds.size,
            taskIds: undefined
        }));

        // Daily Trend
        const daily: Record<string, number> = {};
        for (const e of allEntries) {
            const day = new Date(e.date).toISOString().split('T')[0];
            daily[day] = (daily[day] || 0) + e.minutes;
        }
        const dailySorted = Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, minutes]) => ({ date, minutes }));

        // Final Summary
        const totalMinutes = allEntries.reduce((sum, e) => sum + e.minutes, 0);
        const uniqueTasks = new Set(allEntries.map(e => e.taskId));

        return NextResponse.json({
            summary: {
                totalMinutes,
                totalHours: parseFloat((totalMinutes / 60).toFixed(1)),
                avgMinutesPerTask: uniqueTasks.size > 0 ? Math.round(totalMinutes / uniqueTasks.size) : 0,
                avgHoursPerTask: uniqueTasks.size > 0 ? parseFloat((totalMinutes / 60 / uniqueTasks.size).toFixed(1)) : 0,
                tasksWithTimeLogs: uniqueTasks.size,
                activeTimerCount,
            },
            perUser: perUserArray.sort((a, b) => b.totalMinutes - a.totalMinutes),
            perTask: Object.values(perTask).sort((a, b) => b.totalMinutes - a.totalMinutes),
            perProject: perProjectArray.sort((a, b) => b.totalMinutes - a.totalMinutes),
            dailyTrend: dailySorted,
            activeTimers,
            users: (usersRes.data || []).map(u => ({ id: u.id, name: u.name })),
            projects: (projectsRes.data || []).map(p => ({ id: p.id, name: p.name })),
        });

    } catch (error: any) {
        console.error('Time tracking API error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
