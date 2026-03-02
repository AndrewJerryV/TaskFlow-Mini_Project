import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';
import { predictUrgency, isMLAvailable } from '@/lib/ml-engine';

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
// Local ML-powered bottleneck detection
// =============================================
async function localMLBottleneckDetection(tasks: Task[], users: { id: string; name: string }[]) {
    const now = Date.now();
    const bottlenecks: BottleneckResult[] = [];

    // Pre-calculate urgency for all open tasks
    const taskUrgencyMap = new Map<string, number>();
    const openTasks = tasks.filter(t => t.status !== 'Done');

    for (const task of openTasks) {
        const daysUntilDue = task.dueDate
            ? Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : -1;
        const daysSinceUpdate = Math.floor((now - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const createdDaysAgo = Math.floor((now - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        const urgency = predictUrgency({
            priority: task.priority,
            status: task.status,
            daysUntilDue: task.dueDate ? daysUntilDue : 0,
            hasDueDate: !!task.dueDate,
            daysSinceUpdate,
            createdDaysAgo
        });
        taskUrgencyMap.set(task.id, urgency);
    }

    // 1. Process Bottlenecks (Column Analysis)
    const columns = ['To Do', 'In Progress', 'Review'];
    for (const col of columns) {
        const colTasks = openTasks.filter(t => t.status === col);
        const avgDays = calculateAvgDays(colTasks, new Date());

        // Calculate "Urgency Load"
        let totalUrgency = 0;
        let highUrgencyCount = 0;

        colTasks.forEach(t => {
            const u = taskUrgencyMap.get(t.id) || 0;
            totalUrgency += u;
            if (u > 70) highUrgencyCount++;
        });

        const isBottleneck =
            (col === 'In Progress' && highUrgencyCount > 3) ||
            (col === 'Review' && highUrgencyCount > 2) ||
            (colTasks.length > 8);

        if (isBottleneck) {
            let severity: 'low' | 'medium' | 'high' = 'low';
            if (highUrgencyCount > 5 || colTasks.length > 12) severity = 'high';
            else if (highUrgencyCount > 3 || colTasks.length > 8) severity = 'medium';

            bottlenecks.push({
                type: 'process',
                location: col,
                taskCount: colTasks.length,
                avgDaysStuck: avgDays,
                severity,
                recommendation: `${col} has ${highUrgencyCount} high-urgency tasks flagged by AI. Total load: ${colTasks.length}. Reallocate resources immediately.`
            });
        }
    }

    // 2. Person Bottlenecks (User Analysis)
    for (const user of users) {
        const userTasks = openTasks.filter(t => t.assigneeId === user.id);
        const avgDays = calculateAvgDays(userTasks, new Date());

        const staleHighUrgencyTasks = userTasks.filter(t => {
            const u = taskUrgencyMap.get(t.id) || 0;
            const daysSinceUpdate = Math.floor((now - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
            return u > 60 && daysSinceUpdate > 3;
        });

        if (staleHighUrgencyTasks.length >= 2) {
            let severity: 'low' | 'medium' | 'high' = 'low';
            if (staleHighUrgencyTasks.length >= 4) severity = 'high';
            else if (staleHighUrgencyTasks.length >= 2) severity = 'medium';

            bottlenecks.push({
                type: 'person',
                location: user.name,
                taskCount: staleHighUrgencyTasks.length,
                avgDaysStuck: avgDays,
                severity,
                recommendation: `${user.name} is stalled on ${staleHighUrgencyTasks.length} high-urgency tasks. Check for blockers or reduce WIP.`
            });
        }
    }

    // 3. Health Score Calculation
    // Base 100
    // -15 for high severity bottleneck
    // -10 for medium
    // -5 for low
    let deduction = 0;
    bottlenecks.forEach(b => {
        if (b.severity === 'high') deduction += 15;
        else if (b.severity === 'medium') deduction += 10;
        else deduction += 5;
    });

    const overallHealthScore = Math.max(0, 100 - deduction);

    let healthSummary = "Project workflow is healthy and efficient.";
    if (overallHealthScore < 50) healthSummary = "Critical bottlenecks detected. Immediate action required.";
    else if (overallHealthScore < 80) healthSummary = "Workflow showing signs of congestion. Address bottlenecks soon.";

    return {
        bottlenecks,
        summary: {
            processBottlenecks: bottlenecks.filter(b => b.type === 'process').length,
            personBottlenecks: bottlenecks.filter(b => b.type === 'person').length,
            total: bottlenecks.length
        },
        overallHealthScore,
        healthSummary,
        mlPowered: true
    };
}

// =============================================
// API Route Handler
// =============================================
export async function GET() {
    try {
        const tasks = await db.getTasks();
        const users = await db.getUsers();

        // Try ML-powered analysis
        if (isMLAvailable()) {
            try {
                const result = await localMLBottleneckDetection(tasks, users);
                return NextResponse.json(result);
            } catch (error) {
                console.error('ML bottleneck analysis failed, falling back to heuristic:', error);
            }
        }

        // Fallback
        return NextResponse.json(fallbackBottleneckDetection(tasks, users));
    } catch (error) {
        console.error('Error detecting bottlenecks:', error);
        return NextResponse.json(
            { error: 'Failed to detect bottlenecks' },
            { status: 500 }
        );
    }
}
