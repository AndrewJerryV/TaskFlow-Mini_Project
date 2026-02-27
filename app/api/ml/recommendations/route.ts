import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';
import { isOverdue } from '@/lib/utils';
// =============================================
// Fallback: Original heuristic batch recommendations
// =============================================
function fallbackRecommendations(tasks: Task[], currentUserId: string | null) {
    const now = new Date();
    const generated: Array<{
        id: string;
        taskId: string;
        type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk';
        title: string;
        description: string;
        score: number;
        reason: string;
        suggestedAction: string;
    }> = [];

    const getDueInDays = (dateStr?: string) => {
        if (!dateStr) return 999;
        const d = new Date(dateStr);
        return Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
    };

    tasks.forEach(task => {
        if (task.status === 'Done') return;

        let score = 0;
        const reasons: string[] = [];
        let type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk' | null = null;
        let suggestedAction = 'View Details';

        if (task.priority === 'Critical') { score += 40; reasons.push('Critical priority'); }
        else if (task.priority === 'High') { score += 25; reasons.push('High priority'); }

        const dueIn = getDueInDays(task.dueDate);
        if (task.dueDate) {
            if (dueIn < 0) { score += 50; reasons.push(`Overdue by ${Math.abs(dueIn)} days`); }
            else if (dueIn === 0) { score += 40; reasons.push('Due today'); }
            else if (dueIn <= 2) { score += 25; reasons.push(`Due in ${dueIn} days`); }
        }

        const isAssignedToMe = task.assigneeId === currentUserId;
        if (isAssignedToMe) { score += 20; }

        const daysSinceUpdate = Math.floor((now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 3600 * 24));
        if (task.status === 'In Progress' && daysSinceUpdate > 3) {
            score += 15 + daysSinceUpdate;
            reasons.push(`No updates for ${daysSinceUpdate} days`);
        }

        if (task.dueDate && dueIn <= 1) {
            type = 'overdue_risk';
            suggestedAction = dueIn < 0 ? 'Reschedule' : 'Prioritize';
        } else if (task.status === 'In Progress' && daysSinceUpdate > 3) {
            type = 'bottleneck';
            suggestedAction = isAssignedToMe ? 'Update Status' : 'Follow Up';
        } else if (isAssignedToMe && score > 60) {
            type = 'focus';
            suggestedAction = task.status === 'To Do' ? 'Start Task' : 'Continue';
        } else if (task.status === 'To Do' && task.priority === 'Low' && (!task.dueDate || dueIn > 7)) {
            type = 'quick_win';
            score = 40;
            suggestedAction = 'Complete Now';
        }

        if (type && score > 30) {
            generated.push({
                id: `rec-${task.id}`,
                taskId: task.id,
                type,
                title: task.title,
                description: task.description || 'No description provided',
                score: Math.min(score, 100),
                reason: reasons.join(' • '),
                suggestedAction
            });
        }
    });

    return {
        recommendations: generated.sort((a, b) => b.score - a.score).slice(0, 6),
        mlPowered: false
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
        suggestedAction: string;
    }> = [];

    const now = Date.now();

    // To prevent hitting the ML API for completely irrelevant/finished tasks
    const activeTasks = tasks.filter(t => t.status !== 'Done');

    if (activeTasks.length === 0) {
        return { recommendations: [], mlPowered: true };
    }

    // Make parallel requests to Python backend
    const mlPromises = activeTasks.map(async task => {
        const daysUntilDue = task.dueDate
            ? Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : -1;
        const daysSinceUpdate = Math.floor((now - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const createdDaysAgo = Math.floor((now - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const isAssignedToMe = task.assigneeId === currentUserId;

        try {
            const res = await fetch('http://localhost:8000/analyze_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: task.title + " " + (task.description || ""),
                    status: task.status,
                    days_until_due: task.dueDate ? daysUntilDue : 999, // default if no due date
                    days_since_update: daysSinceUpdate
                })
            });

            if (!res.ok) throw new Error(`ML API Error: ${res.status} ${res.statusText}`);
            const data = await res.json();

            return { task, mlData: data.analysis, daysUntilDue, daysSinceUpdate, isAssignedToMe };
        } catch (error: any) {
            console.error(`Error analyzing task ${task.id}:`, error.message || error);
            return null;
        }
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
        if (predicted_priority === 'Critical' && task.priority !== 'Critical') {
            finalScore += 20;
            reasons.push('AI Class: Critical');
        }

        if (task.priority === 'Critical') reasons.push('Critical');
        if (task.priority === 'High') reasons.push('High Priority');
        if (task.dueDate && isOverdue(task.dueDate)) reasons.push('Overdue');

        // 4. Categorization
        let type: 'focus' | 'bottleneck' | 'quick_win' | 'overdue_risk' | null = null;
        let suggestedAction = 'View Details';

        if (task.dueDate && daysUntilDue <= 1) {
            type = 'overdue_risk';
            suggestedAction = daysUntilDue < 0 ? 'Reschedule' : 'Prioritize';
        } else if (task.status === 'In Progress' && daysSinceUpdate > 3) {
            type = 'bottleneck';
            suggestedAction = 'Update Status';
            reasons.push(`Stale ${daysSinceUpdate}d`);
        } else if (urgency_score > 70 || (isAssignedToMe && urgency_score > 50)) {
            type = 'focus';
            suggestedAction = task.status === 'To Do' ? 'Start Task' : 'Continue';
        } else if (task.status === 'To Do' && finalScore < 50 && predicted_priority === 'Low') {
            type = 'quick_win';
            suggestedAction = 'Complete Now';
            reasons.push('Low Effort');
        }

        if (type && finalScore > 30) {
            generated.push({
                id: `rec-${task.id}`,
                taskId: task.id,
                type,
                title: task.title,
                description: `Urgency: ${Math.min(100, Math.round(urgency_score))}/100 • Predicted priority: ${predicted_priority} (${confidence_score} conf)`,
                score: Math.min(Math.round(finalScore), 100),
                reason: reasons.join(' • '),
                suggestedAction
            });
        }
    }

    if (generated.length === 0) {
        // If Python server fails entirely, we might return 0 recommendations. Route handler catches this.
        throw new Error("No recommendations generated (ML backend may be completely unreachable, or tasks did not meet score threshold)");
    }

    return {
        recommendations: generated.sort((a, b) => {
            if (a.type === 'overdue_risk' && b.type !== 'overdue_risk') return -1;
            if (b.type === 'overdue_risk' && a.type !== 'overdue_risk') return 1;
            return b.score - a.score;
        }).slice(0, 6),
        mlPowered: true
    };
}

// =============================================
// API Route Handler
// =============================================
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const userId = searchParams.get('userId');
        const filterByUserId = searchParams.get('filterByUserId') === 'true';

        let tasks = projectId
            ? await db.getTasks(projectId)
            : await db.getTasks();

        // If 'filterByUserId' is true, immediately restrict the entire dataset 
        // down to tasks assigned exactly to this user.
        if (filterByUserId && userId) {
            tasks = tasks.filter(t => t.assigneeId === userId);
        }

        console.log(`[ML API] Found ${tasks.length} tasks for projectId: ${projectId || 'ALL'}`);

        // Try ML-powered recommendations (Ping Python Server via first task as health check)
        try {
            // Give 500ms timeout for health check, or just attempt batch inference
            const result = await localMLRecommendations(tasks, userId);
            return NextResponse.json(result);
        } catch (error: any) {
            console.warn('ML batch recommendations failed, falling back:', error.message);
        }

        // Fallback
        return NextResponse.json(fallbackRecommendations(tasks, userId));
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return NextResponse.json(
            { error: 'Failed to generate recommendations' },
            { status: 500 }
        );
    }
}
