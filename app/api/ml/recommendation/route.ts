import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';
import { isOverdue } from '@/lib/utils';
import { predictUrgency, predictPriority, isMLAvailable } from '@/lib/ml-engine';

// =============================================
// Fallback: Original heuristic scoring
// =============================================
const PRIORITY_SCORE: Record<string, number> = {
    Critical: 100,
    High: 70,
    Medium: 40,
    Low: 20
};

function fallbackRecommendation(userTasks: Task[]) {
    const scored = userTasks.map(task => {
        let score = PRIORITY_SCORE[task.priority] || 20;
        const reasons: string[] = [];

        if (task.dueDate && isOverdue(task.dueDate)) {
            score += 60;
            reasons.push('overdue');
        }

        if (task.dueDate) {
            const daysUntilDue = Math.ceil(
                (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilDue <= 2 && daysUntilDue > 0) {
                score += 35;
                reasons.push('due soon');
            }
        }

        if (task.status === 'In Progress') {
            score += 30;
            reasons.push('in progress');
        }

        if (task.priority === 'Critical') {
            reasons.push('critical priority');
        }

        return { task, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];

    let reason = `Focus on "${top.task.title}"`;
    if (top.reasons.includes('overdue')) {
        reason += ' - ⚠️ This task is overdue!';
    } else if (top.reasons.includes('due soon')) {
        reason += ' - Due within 2 days, tackle it now.';
    } else if (top.reasons.includes('in progress')) {
        reason += ' - Complete what you started for momentum.';
    } else if (top.reasons.includes('critical priority')) {
        reason += ' - Critical priority requires immediate attention.';
    } else {
        reason += ' - High impact based on priority analysis.';
    }

    return {
        taskOfTheDay: top.task,
        reason,
        score: top.score,
        totalOpenTasks: userTasks.length,
        mlPowered: false
    };
}

// =============================================
// Local ML-powered recommendation
// =============================================
async function localMLRecommendation(userTasks: Task[]) {
    const scoredTasks = userTasks.map(task => {
        // 1. Calculate urgency score using Gradient Boosting model
        const daysUntilDue = task.dueDate
            ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : -1;

        const daysSinceUpdate = Math.floor((Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const createdDaysAgo = Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        const urgencyScore = predictUrgency({
            priority: task.priority,
            status: task.status,
            daysUntilDue: task.dueDate ? daysUntilDue : 0,
            hasDueDate: !!task.dueDate,
            daysSinceUpdate,
            createdDaysAgo
        });

        // 2. Classify priority using Random Forest (sanity check)
        const predictedPriority = predictPriority(task.title, task.description || '');

        // Boost score if model thinks it's Critical but user set it lower
        let finalScore = urgencyScore;
        if (predictedPriority === 'Critical' && task.priority !== 'Critical') {
            finalScore += 20;
        }

        // 3. Determine reason and category
        let category = 'focus';
        let reason = `AI Urgency Score: ${Math.round(finalScore)}/100. `;

        if (task.dueDate && isOverdue(task.dueDate)) {
            category = 'overdue_risk';
            reason += 'This task is overdue and flagged as high risk.';
        } else if (daysUntilDue <= 2 && daysUntilDue >= 0 && task.dueDate) {
            category = 'focus';
            reason += 'Due very soon, prioritizing this is recommended.';
        } else if (predictedPriority === 'Critical') {
            category = 'focus';
            reason += `AI analysis suggests this is Critical relative to other tasks.`;
        } else if (task.status === 'In Progress' && daysSinceUpdate > 3) {
            category = 'bottleneck';
            reason += 'Stalled in progress - needs movement.';
        } else if (finalScore > 75) {
            reason += 'High predicted urgency based on task patterns.';
        } else {
            category = 'quick_win';
            reason += 'Good candidate for a quick win.';
        }

        return {
            taskId: task.id,
            title: task.title,
            score: finalScore,
            category,
            reason
        };
    });

    // Sort by score descending
    scoredTasks.sort((a, b) => b.score - a.score);
    const top = scoredTasks[0];
    const recommendedTask = userTasks.find(t => t.id === top.taskId);

    return {
        taskOfTheDay: recommendedTask || userTasks[0],
        reason: top.reason,
        score: Math.round(top.score),
        totalOpenTasks: userTasks.length,
        mlPowered: true,
        rankings: scoredTasks
    };
}

// =============================================
// API Route Handler
// =============================================
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId query parameter is required' },
                { status: 400 }
            );
        }

        const tasks = await db.getTasks();
        const userTasks = tasks.filter(t =>
            t.assigneeId === userId &&
            t.status !== 'Done'
        );

        if (userTasks.length === 0) {
            return NextResponse.json({
                taskOfTheDay: null,
                reason: 'No open tasks assigned to you. Great job! 🎉',
                mlPowered: isMLAvailable()
            });
        }

        // Try ML-powered recommendation
        if (isMLAvailable()) {
            try {
                const result = await localMLRecommendation(userTasks);
                return NextResponse.json(result);
            } catch (error) {
                console.error('ML recommendation failed, falling back to heuristic:', error);
            }
        }

        // Fallback to original heuristic
        return NextResponse.json(fallbackRecommendation(userTasks));
    } catch (error) {
        console.error('Error generating task recommendation:', error);
        return NextResponse.json(
            { error: 'Failed to generate recommendation' },
            { status: 500 }
        );
    }
}
