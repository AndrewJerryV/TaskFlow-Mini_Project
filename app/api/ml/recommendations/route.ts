import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';
import { isOverdue } from '@/lib/utils';
import { predictUrgency, predictPriority, isMLAvailable } from '@/lib/ml-engine';

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
// Local ML-powered batch recommendations
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

    tasks.forEach(task => {
        if (task.status === 'Done') return;

        // 1. Calculate metrics
        const daysUntilDue = task.dueDate
            ? Math.ceil((new Date(task.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
            : -1;
        const daysSinceUpdate = Math.floor((now - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const createdDaysAgo = Math.floor((now - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const isAssignedToMe = task.assigneeId === currentUserId;

        // 2. ML Inference
        const urgencyScore = predictUrgency({
            priority: task.priority,
            status: task.status,
            daysUntilDue: task.dueDate ? daysUntilDue : 0,
            hasDueDate: !!task.dueDate,
            daysSinceUpdate,
            createdDaysAgo
        });

        const predictedPriority = predictPriority(task.title, task.description || '');

        // 3. Score adjustment
        let finalScore = urgencyScore;
        const reasons: string[] = [];

        if (isAssignedToMe) {
            finalScore += 15; // User relevance boost
        }

        // Priority mismatch boost
        if (predictedPriority === 'Critical' && task.priority !== 'Critical') {
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
        } else if (urgencyScore > 70 || (isAssignedToMe && urgencyScore > 50)) {
            type = 'focus';
            suggestedAction = task.status === 'To Do' ? 'Start Task' : 'Continue';
        } else if (task.status === 'To Do' && finalScore < 50 && predictedPriority === 'Low') {
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
                description: `AI Urgency: ${Math.round(urgencyScore)}/100 • Predicted: ${predictedPriority}`,
                score: Math.min(Math.round(finalScore), 100),
                reason: reasons.join(' • '),
                suggestedAction
            });
        }
    });

    return {
        recommendations: generated.sort((a, b) => b.score - a.score).slice(0, 6),
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

        const tasks = projectId
            ? await db.getTasks(projectId)
            : await db.getTasks();

        // Try ML-powered recommendations
        if (isMLAvailable()) {
            try {
                const result = await localMLRecommendations(tasks, userId);
                return NextResponse.json(result);
            } catch (error) {
                console.error('ML batch recommendations failed, falling back:', error);
            }
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
