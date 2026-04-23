import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';
import { assignTaskWithEngine } from '@/lib/ml-engine';

interface AssignmentCandidate {
    id: string;
    name: string;
    match_percentage: number;
    combined_ranking_score: number;
    wellness_score: number;
    wellness_status: string;
    matching_skills: string[];
}

interface AssignmentResponse {
    suggested_assignees: AssignmentCandidate[];
    analysis?: {
        predicted_priority?: string;
        confidence_score?: string;
        urgency_score?: number;
        urgency_label?: string;
        detected_skills?: string[];
    };
}

async function smartAssignment(users: User[], allTasks: Task[], title: string, description: string, status: string, daysUntilDue: number) {
    try {
        const data = assignTaskWithEngine({
            title,
            description,
            status: status,
            daysUntilDue,
            daysSinceUpdate: 0,
            candidates: users.map(u => {
                // Calculate real wellness stats for this user
                const userTasks = allTasks.filter(t => t.assigneeId === u.id && t.status !== 'Done');
                const highPriorityCount = userTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
                const now = new Date();
                const criticalUrgencyCount = userTasks.filter(t => t.dueDate && new Date(t.dueDate) <= now).length;

                return {
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    skills: u.skills || [],
                    burnoutSensitivity: u.burnoutSensitivity,
                    wellness_data: {
                        active_tasks: userTasks.length,
                        high_priority_count: highPriorityCount,
                        critical_urgency_count: criticalUrgencyCount
                    }
                }
            })
        });
        const bestMatch = data.suggested_assignees[0];

        if (!bestMatch) {
            throw new Error("No suggestions returned from the assignment engine");
        }

        // Find the user object for the suggested assignee
        const suggestedUser = users.find(u => u.id === bestMatch.id) || users.find(u => u.name === bestMatch.name);

        if (!suggestedUser) {
            throw new Error("Suggested user not found in database");
        }

        return {
            suggestedUser,
            candidateId: suggestedUser.id,
            allCandidates: data.suggested_assignees.map((c) => ({
                name: c.name,
                id: c.id,
                score: Math.min(100, Math.round(c.combined_ranking_score)),
                match_percentage: c.match_percentage,
                wellness_score: c.wellness_score,
                wellness_status: c.wellness_status,
                risk: c.wellness_score < 40 ? 'High' : (c.wellness_score < 70 ? 'Medium' : 'Low'),
                matchingSkills: c.matching_skills || [],
                partialMatches: []
            })),
            analysis: (data as any).analysis,
            mlPowered: true
        };
    } catch (error) {
        console.error("TaskFlow AI Assignment failed:", error);
        throw error;
    }
}

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

        try {
            const daysUntilDue = 7;
            const result = await smartAssignment(users, allTasks, title, description, 'To Do', daysUntilDue);
            return NextResponse.json(result);
        } catch (_error) {
            return NextResponse.json(
                { error: 'AI Assignment service is currently unavailable. Please try again later or assign manually.', status: 'unavailable' },
                { status: 503 }
            );
        }
    } catch (error) {
        console.error('AI Assignment Error:', error);
        return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 });
    }
}
