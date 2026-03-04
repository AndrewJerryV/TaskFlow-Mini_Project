import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        const supabase = getSupabase();

        // Build query for tasks
        let query = supabase
            .from('tasks')
            .select('id, title, project_id, assignee_id, time_logs, active_timer_start, status, priority');

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data: tasks, error: tasksError } = await query;
        if (tasksError) {
            return NextResponse.json({ error: tasksError.message }, { status: 500 });
        }

        // Fetch projects for name mapping
        const { data: projects } = await supabase
            .from('projects')
            .select('id, name, key');

        // Fetch users for name mapping
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email, avatar_url');

        const projectMap = new Map((projects || []).map(p => [p.id, p]));
        const userMap = new Map((users || []).map(u => [u.id, u]));

        // Process time_logs from all tasks
        interface TimeEntry {
            taskId: string;
            taskTitle: string;
            projectId: string;
            projectName: string;
            assigneeId: string;
            userId: string;
            userName: string;
            minutes: number;
            date: string;
        }

        const allEntries: TimeEntry[] = [];
        let activeTimerCount = 0;
        const activeTimers: { taskId: string; taskTitle: string; userId: string; userName: string; startedAt: string }[] = [];

        for (const task of (tasks || [])) {
            const timeLogs = Array.isArray(task.time_logs) ? task.time_logs :
                (typeof task.time_logs === 'string' ? JSON.parse(task.time_logs) : []);

            const project = projectMap.get(task.project_id);

            for (const log of timeLogs) {
                // Apply user filter
                if (userId && log.userId !== userId) continue;

                // Apply date filter
                if (startDate && log.date && new Date(log.date) < new Date(startDate)) continue;
                if (endDate && log.date && new Date(log.date) > new Date(endDate + 'T23:59:59')) continue;

                const user = userMap.get(log.userId);
                allEntries.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    projectId: task.project_id,
                    projectName: project?.name || 'Unknown',
                    assigneeId: task.assignee_id || '',
                    userId: log.userId,
                    userName: user?.name || 'Unknown',
                    minutes: log.minutes || 0,
                    date: log.date || '',
                });
            }

            // Track active timers
            if (task.active_timer_start) {
                activeTimerCount++;
                const assignee = userMap.get(task.assignee_id);
                activeTimers.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    userId: task.assignee_id || '',
                    userName: assignee?.name || 'Unknown',
                    startedAt: task.active_timer_start,
                });
            }
        }

        // Aggregate per-user
        const perUser: Record<string, { userId: string; userName: string; totalMinutes: number; taskCount: number }> = {};
        for (const entry of allEntries) {
            if (!perUser[entry.userId]) {
                perUser[entry.userId] = { userId: entry.userId, userName: entry.userName, totalMinutes: 0, taskCount: 0 };
            }
            perUser[entry.userId].totalMinutes += entry.minutes;
        }
        // Count unique tasks per user
        const userTaskSets: Record<string, Set<string>> = {};
        for (const entry of allEntries) {
            if (!userTaskSets[entry.userId]) userTaskSets[entry.userId] = new Set();
            userTaskSets[entry.userId].add(entry.taskId);
        }
        for (const uid of Object.keys(perUser)) {
            perUser[uid].taskCount = userTaskSets[uid]?.size || 0;
        }

        // Aggregate per-task
        const perTask: Record<string, { taskId: string; taskTitle: string; projectId: string; projectName: string; assigneeId: string; assigneeName: string; totalMinutes: number; lastEntry: string }> = {};

        // Initialize all queried tasks so they appear in the UI even with 0 minutes
        for (const task of (tasks || [])) {
            const assignee = userMap.get(task.assignee_id);
            const project = projectMap.get(task.project_id);
            perTask[task.id] = {
                taskId: task.id,
                taskTitle: task.title,
                projectId: task.project_id,
                projectName: project?.name || 'Unknown',
                assigneeId: task.assignee_id || '',
                assigneeName: assignee?.name || 'Unassigned',
                totalMinutes: 0,
                lastEntry: '',
            };
        }

        for (const entry of allEntries) {
            if (!perTask[entry.taskId]) {
                const assignee = userMap.get(entry.assigneeId);
                perTask[entry.taskId] = {
                    taskId: entry.taskId,
                    taskTitle: entry.taskTitle,
                    projectId: entry.projectId,
                    projectName: entry.projectName,
                    assigneeId: entry.assigneeId,
                    assigneeName: assignee?.name || 'Unassigned',
                    totalMinutes: 0,
                    lastEntry: '',
                };
            }
            perTask[entry.taskId].totalMinutes += entry.minutes;
            if (entry.date > perTask[entry.taskId].lastEntry) {
                perTask[entry.taskId].lastEntry = entry.date;
            }
        }

        // Aggregate per-project
        const perProject: Record<string, { projectId: string; projectName: string; totalMinutes: number; taskCount: number }> = {};
        for (const entry of allEntries) {
            if (!perProject[entry.projectId]) {
                perProject[entry.projectId] = { projectId: entry.projectId, projectName: entry.projectName, totalMinutes: 0, taskCount: 0 };
            }
            perProject[entry.projectId].totalMinutes += entry.minutes;
        }
        // Count unique tasks per project
        const projectTaskSets: Record<string, Set<string>> = {};
        for (const entry of allEntries) {
            if (!projectTaskSets[entry.projectId]) projectTaskSets[entry.projectId] = new Set();
            projectTaskSets[entry.projectId].add(entry.taskId);
        }
        for (const pid of Object.keys(perProject)) {
            perProject[pid].taskCount = projectTaskSets[pid]?.size || 0;
        }

        // Daily breakdown
        const daily: Record<string, number> = {};
        for (const entry of allEntries) {
            if (!entry.date) continue;
            const day = new Date(entry.date).toISOString().split('T')[0];
            daily[day] = (daily[day] || 0) + entry.minutes;
        }
        const dailySorted = Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, minutes]) => ({ date, minutes }));

        // Summary
        const totalMinutes = allEntries.reduce((sum, e) => sum + e.minutes, 0);
        const uniqueTasks = new Set(allEntries.map(e => e.taskId));
        const avgMinutesPerTask = uniqueTasks.size > 0 ? Math.round(totalMinutes / uniqueTasks.size) : 0;

        return NextResponse.json({
            summary: {
                totalMinutes,
                totalHours: parseFloat((totalMinutes / 60).toFixed(1)),
                avgMinutesPerTask,
                avgHoursPerTask: parseFloat((avgMinutesPerTask / 60).toFixed(1)),
                tasksWithTimeLogs: uniqueTasks.size,
                activeTimerCount,
            },
            perUser: Object.values(perUser).sort((a, b) => b.totalMinutes - a.totalMinutes),
            perTask: Object.values(perTask).sort((a, b) => b.totalMinutes - a.totalMinutes),
            perProject: Object.values(perProject).sort((a, b) => b.totalMinutes - a.totalMinutes),
            dailyTrend: dailySorted,
            activeTimers,
            users: (users || []).map(u => ({ id: u.id, name: u.name })),
            projects: (projects || []).map(p => ({ id: p.id, name: p.name })),
        });
    } catch (error: any) {
        console.error('Time tracking API error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
