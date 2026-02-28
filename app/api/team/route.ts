import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';

export async function GET() {
    try {
        const users = await db.getUsers();
        const allTasks = await db.getTasks();

        const teamStats = await Promise.all(users.map(async user => {
            const activeUserTasks = allTasks.filter(t =>
                t.assigneeId === user.id &&
                (t.status === 'To Do' || t.status === 'In Progress')
            );

            const activeTasks = activeUserTasks.length;

            const highPriorityCount = activeUserTasks.filter(t => t.priority === 'High').length;

            const criticalUrgencyCount = activeUserTasks.filter(t => {
                if (t.priority === 'Critical') return true;
                if (t.dueDate && new Date(t.dueDate) < new Date()) return true;
                return false;
            }).length;

            // Fetch wellness score from ML service
            let wellnessScore = user.wellnessScore || 100;
            try {
                const mlRes = await fetch('http://127.0.0.1:8000/analyze_wellness', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        active_tasks: activeTasks,
                        high_priority_count: highPriorityCount,
                        critical_urgency_count: criticalUrgencyCount
                    })
                });

                if (mlRes.ok) {
                    const mlData = await mlRes.json();
                    wellnessScore = mlData.score;
                }
            } catch (err) {
                console.warn("Could not reach ML service for wellness score, using default");
            }

            const maxLoad = user.maxWorkload || 5;
            const utilization = Math.round((activeTasks / maxLoad) * 100);

            let status = 'Healthy';
            if (utilization > 100) status = 'Overloaded';
            else if (utilization > 80) status = 'High';

            return {
                ...user,
                wellnessScore, // Override DB value with real-time ML calculation
                stats: {
                    activeTasks,
                    utilization,
                    status
                }
            };
        }));

        return NextResponse.json(teamStats);
    } catch (error) {
        console.error('Error fetching team stats:', error);
        return NextResponse.json({ error: 'Failed to fetch team stats' }, { status: 500 });
    }
}
