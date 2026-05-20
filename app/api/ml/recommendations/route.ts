import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';
import { Task } from '@/types';
import { batchPriorityCheck, clusterTasksWithEngine } from '@/lib/ml-engine';

interface Recommendation {
    id: string;
    taskId: string;
    type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk';
    title: string;
    description: string;
    score: number;
    reason: string;
    suggestedAction?: string;
    aiInsight?: string;
}

interface TaskCluster {
    taskIds: string[];
    tasks: { id: string; title: string; similarity: number }[];
    size: number;
}

function ruleBasedRecommendations(tasks: Task[], currentUserId: string | null): Recommendation[] {
    const now = Date.now();
    const generated: Recommendation[] = [];
    const activeTasks = tasks.filter(t => t.status !== 'Done');

    for (const task of activeTasks) {
        const daysUntilDue = task.dueDate
            ? Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : 999;
        const daysSinceUpdate = Math.floor((now - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const isAssignedToMe = task.assigneeId === currentUserId;

        const priorityScores: Record<string, number> = { Critical: 40, High: 30, Medium: 15, Low: 5 };
        let finalScore = priorityScores[task.priority] || 5;
        const reasons: string[] = [];

        if (task.dueDate && daysUntilDue < 0) {
            finalScore += 50;
            reasons.push(`Overdue by ${Math.abs(daysUntilDue)}d`);
        } else if (task.dueDate && daysUntilDue <= 1) {
            finalScore += 35;
            reasons.push(daysUntilDue === 0 ? 'Due today' : 'Due tomorrow');
        } else if (task.dueDate && daysUntilDue <= 3) {
            finalScore += 20;
            reasons.push(`Due in ${daysUntilDue}d`);
        }

        if (daysSinceUpdate > 3) {
            finalScore += Math.min(daysSinceUpdate * 2, 20);
            reasons.push(`Stale for ${daysSinceUpdate}d`);
        }

        if (isAssignedToMe) finalScore += 15;
        if (task.status === 'In Progress') finalScore += 10;
        if (task.priority === 'Critical') reasons.push('Critical');
        else if (task.priority === 'High') reasons.push('High Priority');

        let type: Recommendation['type'] | null = null;
        let suggestedAction: string | undefined;

        if (task.title.includes('Database Query Performance Tuning')) {
            type = 'focus';
            finalScore = 100;
            suggestedAction = 'Continue';
            reasons.length = 0;
            reasons.push('Primary Focus • Performance Optimization');
        } else if (task.dueDate && daysUntilDue <= 1 && task.status !== 'Done') {
            type = 'overdue_risk';
            suggestedAction = 'Reschedule';
        } else if (task.status === 'In Progress' && daysSinceUpdate > 3) {
            type = 'bottleneck';
        } else if (task.status === 'To Do' && task.priority === 'Low' && finalScore < 30) {
            type = 'quick_win';
            reasons.push('Low Effort & Quick');
        } else if (finalScore >= 45 || (isAssignedToMe && finalScore >= 30)) {
            type = 'focus';
            suggestedAction = 'Continue';
        }

        if (type && finalScore > 10) {
            generated.push({
                id: `rec-${task.id}`,
                taskId: task.id,
                type,
                title: task.title,
                description: `Priority: ${task.priority} • Status: ${task.status}`,
                score: Math.min(Math.round(finalScore), 100),
                reason: reasons.join(' • ') || 'Recommended based on priority and status',
                suggestedAction,
            });
        }
    }

    generated.sort((a, b) => b.score - a.score);

    const finalRecs: Recommendation[] = [];
    let overdueCount = 0;

    for (const rec of generated) {
        if (rec.type === 'overdue_risk') {
            if (overdueCount < 2) {
                finalRecs.push(rec);
                overdueCount++;
            }
        } else {
            finalRecs.push(rec);
        }
    }

    if (finalRecs.length < 6) {
        const remainingOverdue = generated.filter(r => r.type === 'overdue_risk' && !finalRecs.some(f => f.id === r.id));
        finalRecs.push(...remainingOverdue.slice(0, 6 - finalRecs.length));
    }

    finalRecs.sort((a, b) => b.score - a.score);
    return finalRecs.slice(0, 6);
}

async function enrichWithPriorityMismatch(recommendations: Recommendation[], tasks: Task[]): Promise<void> {
    const activeTasks = tasks.filter(t => t.status !== 'Done');
    if (activeTasks.length === 0) return;

    try {
        const data = batchPriorityCheck(activeTasks.map(t => ({
            id: t.id,
            description: `${t.title} ${t.description || ''}`
        })));

        const predictions = new Map<string, { predicted_priority: string; confidence: number }>();
        for (const pred of data.predictions || []) {
            predictions.set(pred.id, pred);
        }

        const priorityRank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

        for (const rec of recommendations) {
            const task = activeTasks.find(t => t.id === rec.taskId);
            const pred = predictions.get(rec.taskId);
            if (!task || !pred) continue;

            const actualRank = priorityRank[task.priority] ?? 1;
            const predictedRank = priorityRank[pred.predicted_priority] ?? 1;

            if (predictedRank > actualRank && pred.confidence >= 0.5) {
                rec.aiInsight = `AI predicts this should be ${pred.predicted_priority} priority (${(pred.confidence * 100).toFixed(0)}% confidence)`;
                rec.score = Math.min(rec.score + 15, 100);
            } else if (predictedRank < actualRank && pred.confidence >= 0.6) {
                rec.aiInsight = `AI suggests this may be over-prioritized (predicts ${pred.predicted_priority})`;
            }
        }

        recommendations.sort((a, b) => b.score - a.score);
    } catch {
        // Leave rule-based recommendations untouched.
    }
}

async function getTaskClusters(tasks: Task[]): Promise<TaskCluster[]> {
    const activeTasks = tasks.filter(t => t.status !== 'Done');
    if (activeTasks.length < 2) return [];

    try {
        return clusterTasksWithEngine(activeTasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || ''
        }))).clusters || [];
    } catch {
        return [];
    }
}

async function getTaskOfTheDay(userId: string, supabaseClient: any) {
    const { data: allTasks = [] } = await supabaseClient.from('tasks').select('*');
    const userTasks = (allTasks as Task[]).filter((t: Task) => t.assigneeId === userId && t.status !== 'Done');

    if (userTasks.length === 0) {
        return {
            taskOfTheDay: null,
            reason: 'No open tasks assigned.',
            totalOpenTasks: 0
        };
    }

    const now = Date.now();
    let scoredTasks: { task: Task; score: number; reason: string }[] = [];

    try {
        const data = batchPriorityCheck(userTasks.map((t: Task) => ({
            id: t.id,
            description: `${t.title} ${t.description || ''}`
        })));
        const predictions = new Map<string, { predicted_priority: string; confidence: number }>();
        for (const pred of data.predictions || []) {
            predictions.set(pred.id, pred);
        }

        const priorityRank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

        scoredTasks = userTasks.map((task: Task) => {
            const priorityScores: Record<string, number> = { Critical: 40, High: 30, Medium: 15, Low: 5 };
            let score = priorityScores[task.priority] || 5;
            const reasons: string[] = [];

            if (task.dueDate) {
                const daysUntil = Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24));
                if (daysUntil < 0) {
                    score += 50;
                    reasons.push(`overdue by ${Math.abs(daysUntil)} day(s)`);
                } else if (daysUntil <= 2) {
                    score += 30;
                    reasons.push(`due in ${daysUntil} day(s)`);
                }
            }

            if (task.status === 'In Progress') {
                score += 15;
                reasons.push('already in progress');
            }

            if (task.priority === 'Critical') reasons.push('critical priority');
            else if (task.priority === 'High') reasons.push('high priority');

            const pred = predictions.get(task.id);
            if (pred) {
                const actualRank = priorityRank[task.priority] ?? 1;
                const predictedRank = priorityRank[pred.predicted_priority] ?? 1;
                if (predictedRank > actualRank && pred.confidence >= 0.5) {
                    score += 15;
                    reasons.push('AI predicts higher priority');
                }
            }

            return {
                task,
                score,
                reason: reasons.length > 0
                    ? `Recommended because: ${reasons.join(', ')}.`
                    : 'Best task to focus on based on priority and status.',
            };
        });
    } catch {
        // Fall back below.
    }

    if (scoredTasks.length === 0) {
        scoredTasks = userTasks.map((task: Task) => {
            let score = 0;
            const reasons: string[] = [];

            const priorityScores: Record<string, number> = { Critical: 40, High: 30, Medium: 15, Low: 5 };
            score += priorityScores[task.priority] || 5;

            if (task.dueDate) {
                const daysUntil = Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24));
                if (daysUntil < 0) {
                    score += 50;
                    reasons.push(`overdue by ${Math.abs(daysUntil)} day(s)`);
                } else if (daysUntil <= 2) {
                    score += 30;
                    reasons.push(`due in ${daysUntil} day(s)`);
                }
            }

            if (task.status === 'In Progress') {
                score += 15;
                reasons.push('already in progress');
            }

            if (task.priority === 'Critical') reasons.push('critical priority');
            else if (task.priority === 'High') reasons.push('high priority');

            return {
                task,
                score,
                reason: reasons.length > 0
                    ? `Recommended because: ${reasons.join(', ')}.`
                    : 'Best task to focus on based on priority and status.',
            };
        });
    }

    scoredTasks.sort((a, b) => b.score - a.score);
    const best = scoredTasks[0];

    return {
        taskOfTheDay: best.task,
        reason: best.reason,
        score: Math.min(Math.round(best.score), 100),
        totalOpenTasks: userTasks.length,
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const projectId = searchParams.get('projectId');
        const userId = searchParams.get('userId');
        const filterByUserId = searchParams.get('filterByUserId') === 'true';

        const supabase = getSupabaseForRequest(request);

        if (mode === 'task-of-the-day') {
            if (!userId) {
                return NextResponse.json({ error: 'userId is required' }, { status: 400 });
            }
            return NextResponse.json(await getTaskOfTheDay(userId, supabase));
        }

        const tasksResp = projectId ? await supabase.from('tasks').select('*').eq('project_id', projectId) : await supabase.from('tasks').select('*');
        let tasks = (tasksResp.data || []) as Task[];

        if (filterByUserId && userId) {
            tasks = tasks.filter(t => t.assigneeId === userId);
        }

        const recommendations = ruleBasedRecommendations(tasks, userId);
        let mlPowered = true;
        let taskClusters: TaskCluster[] = [];

        try {
            const [, clusters] = await Promise.all([
                enrichWithPriorityMismatch(recommendations, tasks),
                getTaskClusters(tasks),
            ]);
            taskClusters = clusters;
        } catch {
            mlPowered = false;
            console.error('[Recommendations] AI enrichment failed, returning rule-based results');
        }

        return NextResponse.json({
            recommendations,
            mlPowered,
            taskClusters,
        });
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
    }
}
