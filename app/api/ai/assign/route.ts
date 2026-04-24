import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';
import { analyzeAndAssignTask, type CandidateInput } from '@/lib/ml-transformers';

// Force Node.js runtime (required for @xenova/transformers ONNX)
export const runtime = 'nodejs';

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

        const users = await db.getUsers();
        const allTasks = await db.getTasks();

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
            return NextResponse.json(
                { error: 'AI Assignment service is currently unavailable. Please try again later or assign manually.', status: 'unavailable' },
                { status: 503 },
            );
        }
    } catch (error) {
        console.error('AI Assignment Error:', error);
        return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 });
    }
}
