import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';
import { checkMLServerAvailability } from '@/lib/utils';

interface MLAnalysis {
    predicted_priority: string;
    urgency_score: number;
    confidence_score: number;
}

interface MLResponse {
    analysis: MLAnalysis;
}

async function analyzeTaskWithML(task: Task, now: number) {
    const daysUntilDue = task.dueDate
        ? Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
        : 999;
    const daysSinceUpdate = Math.floor(
        (now - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    try {
        const res = await fetch('http://127.0.0.1:8000/analyze_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: task.title + ' ' + (task.description || ''),
                status: task.status,
                days_until_due: daysUntilDue,
                days_since_update: daysSinceUpdate,
            }),
        });

        if (!res.ok) {
            return null;
        }

        const data = (await res.json()) as MLResponse;
        return {
            analysis: data.analysis,
            daysUntilDue,
            daysSinceUpdate,
        };
    } catch {
        return null;
    }
}

async function getTaskOfTheDay(userId: string) {
    const allTasks = await db.getTasks();
    const userTasks = allTasks.filter(
        (t: Task) => t.assigneeId === userId && t.status !== 'Done'
    );

    if (userTasks.length === 0) {
        return {
            taskOfTheDay: null,
            reason: 'No open tasks assigned.',
            totalOpenTasks: 0
        };
    }

    const isMLAvailable = await checkMLServerAvailability();
    let scoredTasks: { task: Task; score: number; reason: string }[] = [];

    if (isMLAvailable) {
        const now = Date.now();
        const mlPromises = userTasks.map(async (task: Task) => {
            const mlResult = await analyzeTaskWithML(task, now);
            if (!mlResult) return null;

            const { urgency_score, predicted_priority } = mlResult.analysis;
            const { daysUntilDue } = mlResult;

            const reasons: string[] = [];
            if (daysUntilDue < 0) reasons.push(`overdue by ${Math.abs(daysUntilDue)} day(s)`);
            else if (daysUntilDue <= 2) reasons.push(`due in ${daysUntilDue} day(s)`);
            if (task.priority === 'Critical') reasons.push('critical priority');
            else if (task.priority === 'High') reasons.push('high priority');
            if (predicted_priority === 'High' && task.priority !== 'High' && task.priority !== 'Critical') {
                reasons.push('AI predicts higher priority');
            }
            if (task.status === 'In Progress') reasons.push('already in progress');

            let score = urgency_score;
            if (task.status === 'In Progress') score += 10;

            return {
                task,
                score,
                reason: reasons.length > 0
                    ? `Recommended because: ${reasons.join(', ')}.`
                    : `AI urgency score: ${Math.round(urgency_score)}/100.`,
            };
        });

        const results = await Promise.all(mlPromises);
        scoredTasks = results.filter(Boolean) as typeof scoredTasks;
    }

    if (scoredTasks.length === 0) {
        const now = Date.now();
        scoredTasks = userTasks.map((task: Task) => {
            let score = 0;
            const reasons: string[] = [];

            const priorityScores: Record<string, number> = { Critical: 40, High: 30, Medium: 15, Low: 5 };
            score += priorityScores[task.priority] || 5;

            if (task.dueDate) {
                const daysUntil = Math.ceil(
                    (new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24)
                );
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

// =============================================
// Local ML-powered batch recommendations (Python Backend)
// =============================================
async function localMLRecommendations(tasks: Task[], currentUserId: string | null) {
    const generated: Array<{
        id: string;
        taskId: string;
        type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk';
        title: string;
        description: string;
        score: number;
        reason: string;
        suggestedAction?: string;
    }> = [];

    const now = Date.now();

    // Check ML server availability first to avoid multiple timed-out individual requests
    const isAvailable = await checkMLServerAvailability();
    if (!isAvailable) {
        throw new Error("ML backend is unreachable");
    }

    // To prevent hitting the ML API for completely irrelevant/finished tasks
    const activeTasks = tasks.filter(t => t.status !== 'Done');

    if (activeTasks.length === 0) {
        return { recommendations: [], mlPowered: true };
    }

    // Make parallel requests to Python backend
    const mlPromises = activeTasks.map(async task => {
        const fallbackDaysUntilDue = task.dueDate
            ? Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : -1;
        const isAssignedToMe = task.assigneeId === currentUserId;

        const mlResult = await analyzeTaskWithML(task, now);
        if (!mlResult) {
            console.error(`Error analyzing task ${task.id}:`, 'ML API unavailable for this task');
            return null;
        }

        const daysUntilDue = task.dueDate ? mlResult.daysUntilDue : fallbackDaysUntilDue;
        return {
            task,
            mlData: mlResult.analysis,
            daysUntilDue,
            daysSinceUpdate: mlResult.daysSinceUpdate,
            isAssignedToMe
        };
    });

    const results = await Promise.all(mlPromises);

    // Process successful ML analysis
    for (const result of results) {
        if (!result) continue;

        const { task, mlData, daysUntilDue, daysSinceUpdate, isAssignedToMe } = result;
        const { predicted_priority, urgency_score, confidence_score } = mlData;

        // 3. Score adjustment
        let finalScore = urgency_score;
        const reasons: string[] = [];

        if (isAssignedToMe) {
            finalScore += 15; // User relevance boost
        }

        // Priority mismatch boost
        const priorityScores: Record<string, number> = { 'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3 };
        const mlPriorityScore = priorityScores[predicted_priority] ?? 0;
        const taskPriorityScore = priorityScores[task.priority] ?? 0;

        if (mlPriorityScore > taskPriorityScore) {
            finalScore += 15;
            reasons.push(`AI Class: ${predicted_priority}`);
        }

        if (task.priority === 'Critical') reasons.push('Critical');
        if (task.priority === 'High') reasons.push('High Priority');

        // 4. Categorization
        let type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk' | null = null;
        let suggestedAction: string | undefined;

        if (task.dueDate && daysUntilDue <= 1 && task.status !== 'Done') {
            type = 'overdue_risk';
            // Show Reschedule for overdue, due-today, and due-soon (<=1 day) tasks
            if (daysUntilDue <= 1) {
                suggestedAction = 'Reschedule';
            }
            // Log for debugging
            console.log(`[ML Rec] Task ${task.title} daysUntilDue:`, daysUntilDue);
            reasons.push(
                daysUntilDue < 0 ? `Overdue by ${Math.abs(daysUntilDue)}d`
                : daysUntilDue === 0 ? 'Due today'
                : daysUntilDue === 1 ? 'Due soon' : ''
            );
        } else if (task.status === 'In Progress' && daysSinceUpdate > 3) {
            type = 'bottleneck';
            reasons.push(`Stale for ${daysSinceUpdate}d`);
        } else if (task.status === 'To Do' && predicted_priority === 'Low' && finalScore < 40) {
            type = 'quick_win';
            reasons.push('Low Effort & Quick');
        } else if (finalScore >= 45 || (isAssignedToMe && finalScore >= 30)) {
            type = 'focus';
            suggestedAction = 'Continue';
        }

        if (type && finalScore > 10) { // lowered threshold to include quick wins
            generated.push({
                id: `rec-${task.id}`,
                taskId: task.id,
                type,
                title: task.title,
                description: `Urgency: ${Math.min(100, Math.round(urgency_score))}/100 • Predicted priority: ${predicted_priority} (${confidence_score} conf)`,
                score: Math.min(Math.round(finalScore), 100),
                reason: reasons.join(' • ') || 'General Recommendation',
                suggestedAction
            });
        }
    }

    if (generated.length === 0) {
        // If Python server fails entirely, we might return 0 recommendations. Route handler catches this.
        throw new Error("No recommendations generated (ML backend may be completely unreachable, or tasks did not meet score threshold)");
    }

    // Sort by natural score descending
    const sorted = generated.sort((a, b) => b.score - a.score);

    // Enforce diversity: allow max 2 of a single type initially
    const finalRecs: typeof generated = [];
    let overdueCount = 0;

    for (const rec of sorted) {
        if (rec.type === 'overdue_risk') {
            if (overdueCount < 2) {
                finalRecs.push(rec);
                overdueCount++;
            }
        } else {
            finalRecs.push(rec);
        }
    }

    // If we missed slots (say only 3 total recs without overdue risks), backfill with extra overdue_risk
    if (finalRecs.length < 6) {
        const remainingOverdue = sorted.filter(r => r.type === 'overdue_risk' && !finalRecs.some(f => f.id === r.id));
        finalRecs.push(...remainingOverdue.slice(0, 6 - finalRecs.length));
    }

    // Sort the final pool
    finalRecs.sort((a, b) => b.score - a.score);

    return {
        recommendations: finalRecs.slice(0, 6),
        mlPowered: true
    };
}

// =============================================
// API Route Handler
// =============================================
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const projectId = searchParams.get('projectId');
        const userId = searchParams.get('userId');
        const filterByUserId = searchParams.get('filterByUserId') === 'true';

        if (mode === 'task-of-the-day') {
            if (!userId) {
                return NextResponse.json({ error: 'userId is required' }, { status: 400 });
            }
            const taskOfTheDay = await getTaskOfTheDay(userId);
            return NextResponse.json(taskOfTheDay);
        }

        let tasks = projectId
            ? await db.getTasks(projectId)
            : await db.getTasks();

        // If 'filterByUserId' is true, immediately restrict the entire dataset 
        // down to tasks assigned exactly to this user.
        if (filterByUserId && userId) {
            tasks = tasks.filter(t => t.assigneeId === userId);
        }

        console.log(`[ML API] Found ${tasks.length} tasks for projectId: ${projectId || 'ALL'}`);

        // Try ML-powered recommendations
        try {
            const result = await localMLRecommendations(tasks, userId);
            return NextResponse.json(result);
        } catch (_error) {
            return NextResponse.json(
                { recommendations: [], mlPowered: false, unavailable: true },
                { status: 503 }
            );
        }
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return NextResponse.json(
            { error: 'Failed to generate recommendations' },
            { status: 500 }
        );
    }
}
