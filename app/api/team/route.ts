import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkMLServerAvailability } from '@/lib/utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        let users = await db.getUsers();

        if (userId) {
            const currentUser = await db.getUser(userId);

            if (currentUser && currentUser.role !== 'Admin') {
                // Get all projects this manager is part of
                const userProjects = await db.getProjects(userId);
                const projectIds = userProjects.map(p => p.id);

                // Get all members of those projects
                const allowedMemberIds = new Set<string>();
                for (const pid of projectIds) {
                    const members = await db.getProjectMembers(pid);
                    members.forEach(m => allowedMemberIds.add(m));
                }

                // Filter users to only those in the allowed set
                users = users.filter(u => allowedMemberIds.has(u.id));
            }
        }

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

            // Fetch wellness score from ML service if available
            let wellnessScore = user.wellnessScore || 100;
            try {
                // Check if ML server is available (caching result for the request would be better, but simple check for now)
                const isAvailable = await checkMLServerAvailability();
                if (isAvailable) {
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
                }
            } catch (error) {
                console.error('Wellness ML request failed:', error);
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
