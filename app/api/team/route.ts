import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';

export async function GET() {
    try {
        const users = await db.getUsers();
        const allTasks = await db.getTasks();

        const teamStats = users.map(user => {
            const activeTasks = allTasks.filter(t =>
                t.assigneeId === user.id &&
                (t.status === 'To Do' || t.status === 'In Progress')
            ).length;

            const maxLoad = user.maxWorkload || 5;
            const utilization = Math.round((activeTasks / maxLoad) * 100);

            let status = 'Healthy';
            if (utilization > 100) status = 'Overloaded';
            else if (utilization > 80) status = 'High';

            return {
                ...user,
                stats: {
                    activeTasks,
                    utilization,
                    status
                }
            };
        });

        return NextResponse.json(teamStats);
    } catch (error) {
        console.error('Error fetching team stats:', error);
        return NextResponse.json({ error: 'Failed to fetch team stats' }, { status: 500 });
    }
}
