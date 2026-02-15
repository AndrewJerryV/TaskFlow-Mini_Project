import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Task } from '@/types';
import { isOverdue } from '@/lib/utils';

const PRIORITY_SCORE: Record<string, number> = {
    Critical: 100,
    High: 70,
    Medium: 40,
    Low: 20
};

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
                reason: 'No open tasks assigned to you. Great job! 🎉'
            });
        }

        // Score each task based on multiple factors
        const scored = userTasks.map(task => {
            let score = PRIORITY_SCORE[task.priority] || 20;
            const reasons: string[] = [];

            // Overdue bonus (highest priority)
            if (task.dueDate && isOverdue(task.dueDate)) {
                score += 60;
                reasons.push('overdue');
            }

            // Due soon (within 2 days) bonus
            if (task.dueDate) {
                const daysUntilDue = Math.ceil(
                    (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                if (daysUntilDue <= 2 && daysUntilDue > 0) {
                    score += 35;
                    reasons.push('due soon');
                }
            }

            // In Progress gets priority (finish what you started)
            if (task.status === 'In Progress') {
                score += 30;
                reasons.push('in progress');
            }

            // Critical priority flag
            if (task.priority === 'Critical') {
                reasons.push('critical priority');
            }

            return { task, score, reasons };
        });

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        const top = scored[0];

        // Generate human-readable reason
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

        return NextResponse.json({
            taskOfTheDay: top.task,
            reason,
            score: top.score,
            totalOpenTasks: userTasks.length
        });
    } catch (error) {
        console.error('Error generating task recommendation:', error);
        return NextResponse.json(
            { error: 'Failed to generate recommendation' },
            { status: 500 }
        );
    }
}
