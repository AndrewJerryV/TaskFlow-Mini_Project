import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const users = await db.getUsers();
        const tasks = await db.getTasks();

        const metrics = users.map(user => {
            const activeTasks = tasks.filter(t =>
                t.assigneeId === user.id &&
                (t.status === 'To Do' || t.status === 'In Progress')
            );
            const taskCount = activeTasks.length;
            const maxWorkload = user.maxWorkload || 5;
            const capacityPercent = Math.round((taskCount / maxWorkload) * 100);

            let burnoutRisk: 'Low' | 'Medium' | 'High' = 'Low';
            if (taskCount >= maxWorkload || user.wellnessScore < 50) {
                burnoutRisk = 'High';
            } else if (taskCount >= maxWorkload - 1 || user.wellnessScore < 70) {
                burnoutRisk = 'Medium';
            }

            return {
                userId: user.id,
                name: user.name,
                email: user.email,
                taskCount,
                maxWorkload,
                capacityPercent,
                burnoutRisk,
                wellnessScore: user.wellnessScore || 80,
            };
        });

        // Sort by risk level (High first)
        const riskOrder = { High: 0, Medium: 1, Low: 2 };
        metrics.sort((a, b) => riskOrder[a.burnoutRisk] - riskOrder[b.burnoutRisk]);

        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Error fetching burnout metrics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch burnout metrics' },
            { status: 500 }
        );
    }
}
