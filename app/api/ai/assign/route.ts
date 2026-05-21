import { NextResponse } from 'next/server';
import { User, Task } from '@/types';
import { getSupabaseForRequest } from '@/lib/server-supabase-helper';
import { analyzeAndAssignTask, type CandidateInput } from '@/lib/ml-transformers';

interface AssignRequest {
    title: string;
    description: string;
    priority: string;
    projectId?: string;
}

// API Route Handler
export async function POST(request: Request) {
    try {
        const body: AssignRequest = await request.json();
        const { title, description } = body;

        const supabase = getSupabaseForRequest(request);
        const { data: usersData } = await supabase.from('users').select('id, name, role, skills, skill_experience, wellness_score');
        const { data: tasksData } = await supabase.from('tasks').select('*');

        const users: User[] = (usersData || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email || '',
            avatarUrl: u.avatar_url,
            role: u.role,
            createdAt: u.created_at,
            dob: u.dob,
            skillExperience: typeof u.skill_experience === 'string' ? JSON.parse(u.skill_experience) : (u.skill_experience || {}),
            skills: u.skills || [],
            wellnessScore: u.wellness_score ?? 85,
            maxWorkload: u.max_workload ?? 5,
            burnoutRisk: 'Low'
        } as User));

        const allTasks: Task[] = (tasksData || []).map((t: any) => ({
            id: t.id,
            projectId: t.project_id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            assigneeId: t.assignee_id,
            dueDate: t.due_date,
            startDate: t.start_date,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            tags: t.tags || [],
            dependencies: t.dependencies || [],
        } as Task));

        const taskText = `${title} ${description || ''}`.trim();

        // Build candidates with real wellness data (same as before)
        const now = new Date();
        const candidates: CandidateInput[] = users.map(u => {
            const userTasks = allTasks.filter(t => t.assigneeId === u.id && t.status !== 'Done');
            const highPriorityCount = userTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
            const criticalUrgencyCount = userTasks.filter(t => t.dueDate && new Date(t.dueDate) <= now).length;

            return {
                id: u.id,
                name: u.name,
                role: u.role,
                skills: u.skills || [],
                wellness_data: {
                    active_tasks: userTasks.length,
                    high_priority_count: highPriorityCount,
                    critical_urgency_count: criticalUrgencyCount,
                },
            };
        });

        try {
            const result = await analyzeAndAssignTask(taskText, 'To Do', 7, 0, candidates);

            const bestMatch = result.suggested_assignees[0];
            if (!bestMatch) {
                throw new Error('No suggestions returned from ML engine');
            }

            const suggestedUser = users.find(u => u.id === bestMatch.id);

            return NextResponse.json({
                suggestedUser,
                candidateId: bestMatch.id,
                allCandidates: result.suggested_assignees.map(c => ({
                    name: c.name,
                    id: c.id,
                    score: Math.min(100, Math.round(c.combined_ranking_score)),
                    match_percentage: c.match_percentage,
                    wellness_score: c.wellness_score,
                    wellness_status: c.wellness_status,
                    risk: c.wellness_score < 40 ? 'High' : (c.wellness_score < 70 ? 'Medium' : 'Low'),
                    matchingSkills: c.matching_skills || [],
                    partialMatches: [],
                })),
                analysis: result.analysis,
                mlPowered: true,
            });
        } catch (mlError) {
            console.error('ML Assignment failed:', mlError);
            const msg = mlError instanceof Error ? mlError.message : 'Unknown ML error';
            return NextResponse.json(
                { error: `AI Assignment service is currently unavailable: ${msg}`, status: 'unavailable' },
                { status: 503 },
            );
        }
    } catch (error) {
        console.error('AI Assignment Error:', error);
        return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 });
    }
}
