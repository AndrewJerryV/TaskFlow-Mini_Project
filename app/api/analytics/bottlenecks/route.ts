import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';

// Remove predictUrgency and isMLAvailable. We'll call the Python backend directly for urgency prediction.

const STALE_THRESHOLD_DAYS = 5;
const COLUMN_OVERFLOW_THRESHOLD = 8;

interface BottleneckResult {
    type: 'person' | 'process';
    location: string;
    taskCount: number;
    avgDaysStuck: number;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
}

// =============================================
// Helper
// =============================================
function calculateAvgDays(tasks: Task[], now: Date): number {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => {
        const updatedAt = new Date(t.updatedAt);
        const diff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diff;
    }, 0);
    return Math.round(total / tasks.length);
}

// =============================================
// Fallback: Original threshold-based detection
// =============================================
function fallbackBottleneckDetection(tasks: Task[], users: { id: string; name: string }[]) {
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

        if (columnTasks.length >= COLUMN_OVERFLOW_THRESHOLD) {
            const severity = columnTasks.length >= COLUMN_OVERFLOW_THRESHOLD * 1.5 ? 'high' :
                columnTasks.length >= COLUMN_OVERFLOW_THRESHOLD ? 'medium' : 'low';

            bottlenecks.push({
                type: 'process',
                location: label,
                taskCount: columnTasks.length,
                avgDaysStuck: avgDays,
                severity,
                recommendation: `"${label}" column has ${columnTasks.length} tasks (avg ${avgDays} days). Consider adding capacity, breaking down tasks, or refining the workflow.`
            });
        }
    });

    // Person bottlenecks: Stale tasks per user
    users.forEach(user => {
        const userTasks = tasks.filter(t =>
            t.assigneeId === user.id &&
            t.status !== 'Done'
        );

        const staleTasks = userTasks.filter(t => {
            const updatedAt = new Date(t.updatedAt);
            const days = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            return days > STALE_THRESHOLD_DAYS;
        });

        if (staleTasks.length >= 3) {
            const avgDays = calculateAvgDays(staleTasks, now);
            const severity = staleTasks.length >= 5 ? 'high' :
                staleTasks.length >= 3 ? 'medium' : 'low';

            bottlenecks.push({
                type: 'person',
                location: user.name,
                taskCount: staleTasks.length,
                avgDaysStuck: avgDays,
                severity,
                recommendation: `${user.name} has ${staleTasks.length} stale tasks (no updates in ${avgDays}+ days). Check for blockers, offer support, or redistribute work.`
            });
        }
    });

    const severityOrder = { high: 0, medium: 1, low: 2 };
    bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
        bottlenecks,
        summary: {
            processBottlenecks: bottlenecks.filter(b => b.type === 'process').length,
            personBottlenecks: bottlenecks.filter(b => b.type === 'person').length,
            total: bottlenecks.length
        },
        overallHealthScore: Math.max(0, 100 - (bottlenecks.length * 15)),
        healthSummary: bottlenecks.length === 0 ? "Workflow is healthy." : "Bottlenecks detected.",
        mlPowered: false
    };
}

// =============================================
// ML-powered bottleneck detection (Python backend)
// =============================================
async function localMLBottleneckDetection(tasks: Task[]) {
    const pyRes = await fetch('http://127.0.0.1:8000/analyze_bottlenecks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tasks: tasks.map(t => ({
                id: t.id,
                projectId: t.projectId,
                description: t.description || '',
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate,
                updatedAt: t.updatedAt
            }))
        })
    });

    if (!pyRes.ok) {
        throw new Error(`Python backend returned ${pyRes.status}`);
    }

    return pyRes.json();
}

// =============================================
// API Route Handler
// =============================================
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        let tasks = await db.getTasks();
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

        // Always try ML-powered analysis (Python backend)
        try {
            const result = await localMLBottleneckDetection(tasks);

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

                const ensureGroup = (projectId: string | null | undefined) => {
                    const id = projectId || 'unknown';
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

                (result.bottlenecks || []).forEach((b: BottleneckResult & { projectId?: string }) => {
                    const group = ensureGroup(b.projectId || b.location);
                    group.bottlenecks.push(b);
                });

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
                    projects: Array.from(grouped.values())
                });
            }

            return NextResponse.json(result);
        } catch (error) {
            console.error('ML bottleneck analysis failed, falling back to heuristic:', error);
            // Fallback
            return NextResponse.json(fallbackBottleneckDetection(tasks, users));
        }
    } catch (error) {
        console.error('Error detecting bottlenecks:', error);
        return NextResponse.json(
            { error: 'Failed to detect bottlenecks' },
            { status: 500 }
        );
    }
}
