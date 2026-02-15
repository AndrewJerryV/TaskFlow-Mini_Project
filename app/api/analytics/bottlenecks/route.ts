import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';

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

function calculateAvgDays(tasks: Task[], now: Date): number {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => {
        const updatedAt = new Date(t.updatedAt);
        const diff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + diff;
    }, 0);
    return Math.round(total / tasks.length);
}

export async function GET() {
    try {
        const tasks = await db.getTasks();
        const users = await db.getUsers();
        const now = new Date();

        const bottlenecks: BottleneckResult[] = [];

        // PROCESS BOTTLENECK: Column overflow detection
        const columns: Array<{ status: string; label: string }> = [
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

        // PERSON BOTTLENECK: User with stale or blocked tasks
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

        // Sort by severity
        const severityOrder = { high: 0, medium: 1, low: 2 };
        bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return NextResponse.json({
            bottlenecks,
            summary: {
                processBottlenecks: bottlenecks.filter(b => b.type === 'process').length,
                personBottlenecks: bottlenecks.filter(b => b.type === 'person').length,
                total: bottlenecks.length
            }
        });
    } catch (error) {
        console.error('Error detecting bottlenecks:', error);
        return NextResponse.json(
            { error: 'Failed to detect bottlenecks' },
            { status: 500 }
        );
    }
}
