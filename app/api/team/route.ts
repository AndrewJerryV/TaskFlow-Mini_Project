import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeWellness } from '@/lib/ml-engine';

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

            let wellnessScore = user.wellnessScore || 100;
            try {
                const mlData = analyzeWellness({
                    activeTasks,
                    highPriorityCount,
                    criticalUrgencyCount,
                    sensitivity: user.burnoutSensitivity,
                });
                wellnessScore = mlData.score;
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
