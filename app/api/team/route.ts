import { NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';
import { analyzeWellness } from '@/lib/ml-engine';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const supabase = getSupabaseForRequest(request);

        const { data: usersData } = await supabase.from('users').select('*');
        let users = (usersData || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatarUrl: u.avatar_url,
            role: u.role,
            createdAt: u.created_at,
            dob: u.dob,
            skillExperience: typeof u.skill_experience === 'string' ? JSON.parse(u.skill_experience) : u.skill_experience,
            skills: u.skills || [],
            wellnessScore: u.wellness_score ?? 85,
            maxWorkload: u.max_workload ?? 5,
            burnoutSensitivity: u.burnout_sensitivity,
        }));

        if (userId) {
            const { data: currentUser } = await supabase.from('users').select('id, role').eq('id', userId).maybeSingle();

            if (currentUser && currentUser.role !== 'Admin') {
                const { data: userProjects } = await supabase
                    .from('project_members')
                    .select('project_id')
                    .eq('user_id', userId);

                const projectIds = (userProjects || []).map((p: any) => p.project_id);

                const allowedMemberIds = new Set<string>();
                for (const pid of projectIds) {
                    const { data: members } = await supabase
                        .from('project_members')
                        .select('user_id')
                        .eq('project_id', pid);
                    (members || []).forEach((m: any) => allowedMemberIds.add(m.user_id));
                }

                users = users.filter((u: any) => allowedMemberIds.has(u.id));
            }
        }

        const { data: allTasksData } = await supabase.from('tasks').select('*');
        const allTasks = (allTasksData || []).map((dbTask: any) => ({
            id: dbTask.id,
            projectId: dbTask.project_id,
            title: dbTask.title,
            description: dbTask.description,
            status: dbTask.status,
            priority: dbTask.priority,
            assigneeId: dbTask.assignee_id,
            dueDate: dbTask.due_date,
            startDate: dbTask.start_date,
            createdAt: dbTask.created_at,
            updatedAt: dbTask.updated_at,
            tags: dbTask.tags || [],
            dependencies: dbTask.dependencies || [],
        }));

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
