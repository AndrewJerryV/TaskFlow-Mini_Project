import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';
import { checkMLServerAvailability } from '@/lib/utils';



interface BottleneckResult {
    type: 'person' | 'process';
    location: string;
    taskCount: number;
    avgDaysStuck: number;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
    taskIds?: string[];
}

interface RebalanceSuggestion {
    taskId: string;
    taskTitle: string;
    taskPriority: string;
    fromUser: { id: string; name: string; wellness: number };
    toUser: {
        id: string;
        name: string;
        skillMatch: number;
        wellness: number;
        wellnessStatus: string;
        matchingSkills: string[];
    };
    requiredSkills: string[];
}

// Helper
function calculateAvgDays(tasks: Task[], now: Date): number {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => {
        const updatedAt = new Date(t.updatedAt);
        const diff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diff;
    }, 0);
    return Math.round(total / tasks.length);
}

// Rule-based Detection
function detectBottlenecks(
    tasks: Task[], 
    users: { id: string; name: string }[],
    thresholds: { stale: number, overflow: number }
) {
    const now = new Date();
    const bottlenecks: BottleneckResult[] = [];

    // Process bottlenecks: Column overflow
    const columns = [
        { status: 'To Do', label: 'To Do' },
        { status: 'In Progress', label: 'In Progress' },
        { status: 'Review', label: 'Review' }
    ];

    columns.forEach(({ status, label }) => {
        const columnTasks = tasks.filter(t => t.status === status);
        const avgDays = calculateAvgDays(columnTasks, now);

        if (columnTasks.length >= thresholds.overflow) {
            const severity = columnTasks.length >= thresholds.overflow * 1.5 ? 'high' :
                columnTasks.length >= thresholds.overflow ? 'medium' : 'low';

            bottlenecks.push({
                type: 'process',
                location: label,
                taskCount: columnTasks.length,
                avgDaysStuck: avgDays,
                severity: severity as 'low' | 'medium' | 'high',
                recommendation: `"${label}" column has ${columnTasks.length} tasks piling up.`
            });
        }
    });

    // Overdue work detection
    const overdueTasks = tasks.filter(t => {
        if (!t.dueDate || t.status === 'Done') return false;
        return new Date(t.dueDate) < now;
    });

    if (overdueTasks.length > 0) {
        const avgOverdue = Math.max(1, Math.round(
            overdueTasks.reduce((sum, t) => {
                const due = new Date(t.dueDate!);
                return sum + Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / overdueTasks.length
        ));

        bottlenecks.push({
            type: 'process',
            location: 'Overdue Work',
            taskCount: overdueTasks.length,
            avgDaysStuck: avgOverdue,
            severity: overdueTasks.length >= 5 ? 'high' : 'medium',
            recommendation: `${overdueTasks.length} tasks are overdue (avg ${avgOverdue}d).`,
            taskIds: overdueTasks.map(t => t.id)
        });
    }

    // Person bottlenecks: Stale tasks per user
    users.forEach(user => {
        const userTasks = tasks.filter(t =>
            t.assigneeId === user.id &&
            t.status !== 'Done'
        );

        const staleTasks = userTasks.filter(t => {
            const updatedAt = new Date(t.updatedAt);
            const days = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            return days > thresholds.stale;
        });

        if (staleTasks.length >= 3) {
            const avgDays = calculateAvgDays(staleTasks, now);
            const severity = staleTasks.length >= 5 ? 'medium' :
                staleTasks.length >= 3 ? 'low' : 'low';

            bottlenecks.push({
                type: 'person',
                location: user.name,
                taskCount: staleTasks.length,
                avgDaysStuck: avgDays,
                severity: severity as 'low' | 'medium' | 'high',
                recommendation: `${user.name} has ${staleTasks.length} stale tasks (${avgDays}+ days idle).`
            });
        }
    });

    // Aging WIP detection
    const agingTasks = tasks.filter(t => {
        if (t.status === 'Done') return false;
        const updatedAt = new Date(t.updatedAt);
        const days = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return days >= thresholds.stale;
    });

    if (agingTasks.length >= 3 && !bottlenecks.some(b => b.location === 'Aging WIP')) {
        const avgDays = calculateAvgDays(agingTasks, now);
        bottlenecks.push({
            type: 'process',
            location: 'Aging WIP',
            taskCount: agingTasks.length,
            avgDaysStuck: avgDays,
            severity: agingTasks.length >= 5 ? 'high' : 'medium',
            recommendation: `${agingTasks.length} tasks have been idle for ${thresholds.stale}+ days.`
        });
    }

    const severityOrder = { high: 0, medium: 1, low: 2 };
    bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Health score
    const healthPenalty = bottlenecks.reduce((acc, b) =>
        acc + 10 + (b.severity === 'high' ? 15 : b.severity === 'medium' ? 5 : 0) + (b.taskCount * 2), 0);
    const overallHealthScore = Math.max(0, 100 - healthPenalty);

    const healthSummary = bottlenecks.length === 0
        ? "Workflow is healthy."
        : overallHealthScore < 50
            ? `Critical: ${bottlenecks.length} bottlenecks detected impacting ${bottlenecks.reduce((sum, b) => sum + b.taskCount, 0)} tasks.`
            : `${bottlenecks.length} bottlenecks detected impacting ${bottlenecks.reduce((sum, b) => sum + b.taskCount, 0)} tasks.`;

    return {
        bottlenecks,
        summary: {
            processBottlenecks: bottlenecks.filter(b => b.type === 'process').length,
            personBottlenecks: bottlenecks.filter(b => b.type === 'person').length,
            total: bottlenecks.length
        },
        overallHealthScore,
        healthSummary,
    };
}

// Workload Rebalancing
async function getRebalancingSuggestions(tasks: Task[], users: { id: string; name: string; skills?: string[]; role?: string }[]): Promise<RebalanceSuggestion[]> {
    const now = new Date();

    // Compute per-user workload data
    const userWorkload = new Map<string, {
        user: typeof users[0];
        activeTasks: Task[];
        activeCount: number;
        highPriorityCount: number;
        criticalCount: number;
    }>();

    for (const user of users) {
        const userActiveTasks = tasks.filter(t =>
            t.assigneeId === user.id && t.status !== 'Done'
        );
        const highPriority = userActiveTasks.filter(t => t.priority === 'High').length;
        const critical = userActiveTasks.filter(t => {
            if (t.priority === 'Critical') return true;
            if (t.dueDate && new Date(t.dueDate) < now) return true;
            return false;
        }).length;

        userWorkload.set(user.id, {
            user,
            activeTasks: userActiveTasks,
            activeCount: userActiveTasks.length,
            highPriorityCount: highPriority,
            criticalCount: critical,
        });
    }

    // Get wellness scores for all users
    let wellnessScores = new Map<string, number>();
    try {
        for (const [userId, data] of userWorkload) {
            const res = await fetch('http://127.0.0.1:8000/analyze_wellness', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    active_tasks: data.activeCount,
                    high_priority_count: data.highPriorityCount,
                    critical_urgency_count: data.criticalCount,
                })
            });
            if (res.ok) {
                const result = await res.json();
                wellnessScores.set(userId, result.score);
            }
        }
    } catch {
        return []; // ML unavailable
    }

    // Find overloaded members (wellness < 60)
    const overloaded: Array<{ member: { id: string; name: string; wellness_score: number }; tasks: { id: string; title: string; description: string; priority: string }[] }> = [];
    const available: Array<{ id: string; name: string; skills: string[]; wellness_score: number; active_task_count: number; role: string }> = [];

    for (const [userId, data] of userWorkload) {
        const wellness = wellnessScores.get(userId) ?? 100;

        if (wellness < 60 && data.activeCount > 3) {
            overloaded.push({
                member: { id: userId, name: data.user.name, wellness_score: wellness },
                tasks: data.activeTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    description: t.description || '',
                    priority: t.priority,
                }))
            });
        } else if (wellness >= 60 && data.activeCount < 5) {
            available.push({
                id: userId,
                name: data.user.name,
                // need to get skills from full users array
                skills: (data.user as any).skills || [],
                wellness_score: wellness,
                active_task_count: data.activeCount,
                role: (data.user as any).role || 'Member',
            });
        }
    }

    if (overloaded.length === 0 || available.length === 0) return [];

    try {
        const res = await fetch('http://127.0.0.1:8000/suggest_rebalancing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                overloaded_members: overloaded,
                available_members: available,
            })
        });

        if (!res.ok) return [];

        const data = await res.json();
        return data.suggestions || [];
    } catch {
        return [];
    }
}

// API Route Handler
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const projectId = searchParams.get('projectId');

        let tasks = projectId ? await db.getTasks(projectId) : await db.getTasks();
        const users = await db.getUsers();
        const requester = userId ? await db.getUser(userId) : null;

        if (userId && !requester) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (requester && requester.role !== 'Admin') {
            const userProjects = await db.getProjects(requester.id);
            const projectIds = new Set(userProjects.map(p => p.id));
            tasks = tasks.filter(t => projectIds.has(t.projectId));
        }

        // Determine dynamic thresholds based on Admin's companySize
        let companySize = 'Medium (11-50)';
        const adminUser = users.find(u => u.role === 'Admin');
        if (adminUser && (adminUser as any).companySize) {
            companySize = (adminUser as any).companySize;
        }

        const thresholds = {
            stale: companySize === 'Small (1-10)' ? 3 : companySize === 'Large (50+)' ? 7 : 5,
            overflow: companySize === 'Small (1-10)' ? 5 : companySize === 'Large (50+)' ? 15 : 8,
        };

        // 1. Rule-based detection (always works)
        const result = detectBottlenecks(tasks, users, thresholds);

        // 2. AI rebalancing (optional)
        const isMLAvailable = await checkMLServerAvailability();
        let rebalanceSuggestions: RebalanceSuggestion[] = [];
        let mlPowered = false;

        if (isMLAvailable) {
            try {
                rebalanceSuggestions = await getRebalancingSuggestions(tasks, users);
                mlPowered = true;
            } catch (error) {
                console.error('AI rebalancing failed:', error);
            }
        }

        // 3. Group by project if requester is logged in
        if (requester) {
            const now = new Date();
            const projects = await db.getProjects(requester.role === 'Admin' ? undefined : requester.id);
            const projectMap = new Map(projects.map(p => [p.id, p.name]));

            const grouped = new Map<string, {
                projectId: string;
                projectName: string;
                bottlenecks: BottleneckResult[];
                overdueTasks: { id: string; title: string; status: string; dueDate: string; daysOverdue: number }[];
            }>();

            const ensureGroup = (pid: string | null | undefined) => {
                const id = pid || 'unknown';
                if (!grouped.has(id)) {
                    grouped.set(id, {
                        projectId: id,
                        projectName: projectMap.get(id) || (id === 'unknown' ? 'Unassigned' : 'Unknown Project'),
                        bottlenecks: [],
                        overdueTasks: []
                    });
                }
                return grouped.get(id)!;
            };

            // Distribute bottlenecks to project groups (use projectId from tasks if available)
            for (const b of result.bottlenecks) {
                const matchingProjectId = projectId || (projects.length === 1 ? projects[0].id : null);
                if (matchingProjectId) {
                    const group = ensureGroup(matchingProjectId);
                    group.bottlenecks.push(b);
                }
            }

            // Add overdue tasks
            tasks.forEach(t => {
                if (!t.dueDate || t.status === 'Done') return;
                const due = new Date(t.dueDate);
                if (Number.isNaN(due.getTime())) return;
                if (due >= now) return;
                const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                const group = ensureGroup(t.projectId);
                group.overdueTasks.push({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    dueDate: t.dueDate,
                    daysOverdue
                });
            });

            return NextResponse.json({
                ...result,
                mlPowered,
                rebalanceSuggestions,
                projects: Array.from(grouped.values())
            });
        }

        return NextResponse.json({
            ...result,
            mlPowered,
            rebalanceSuggestions,
        });
    } catch (error) {
        console.error('Error detecting bottlenecks:', error);
        return NextResponse.json(
            { error: 'Failed to detect bottlenecks' },
            { status: 500 }
        );
    }
}
