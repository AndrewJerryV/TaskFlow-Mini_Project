import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';
import { checkMLServerAvailability } from '@/lib/utils';

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
}

// =============================================
// Smart assignment calling Python ML server
// =============================================
async function pythonSmartAssignment(users: User[], allTasks: Task[], title: string, description: string, status: string, daysUntilDue: number) {
    try {
        const payload = {
            description: title + " " + (description || ""),
            status: status,
            days_until_due: daysUntilDue,
            days_since_update: 0,
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
                    wellness_data: {
                        active_tasks: userTasks.length,
                        high_priority_count: highPriorityCount,
                        critical_urgency_count: criticalUrgencyCount
                    }
                };
            })
        };

        const response = await fetch('http://127.0.0.1:8000/analyze_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Python ML server responded with ${response.status}`);
        }

        const data = (await response.json()) as AssignmentResponse;
        const bestMatch = data.suggested_assignees[0];

        if (!bestMatch) {
            throw new Error("No suggestions returned from Python ML server");
        }

        // Find the user object for the suggested assignee
        const suggestedUser = users.find(u => u.id === bestMatch.id) || users.find(u => u.name === bestMatch.name);

        if (!suggestedUser) {
            throw new Error("Suggested user not found in database");
        }

        let reasoning = `**${suggestedUser.name}** is the top AI match with **${bestMatch.combined_ranking_score} assignment score**. `;
        
        reasoning += `This score reflects a **${bestMatch.match_percentage}% skill match** and a **${bestMatch.wellness_status} (${bestMatch.wellness_score}%)** wellness status. `;

        if (suggestedUser.role === 'Member') {
            reasoning += `They were prioritized due to their **Member** role. `;
        } else {
            reasoning += `They hold the role of **${suggestedUser.role}**. `;
        }

        if (bestMatch.matching_skills && bestMatch.matching_skills.length > 0) {
            reasoning += `Their skills in **${bestMatch.matching_skills.slice(0, 3).join(', ')}** strongly match the task requirements. `;
        }

        return {
            suggestedUser,
            candidateId: suggestedUser.id,
            reasoning,
            allCandidates: data.suggested_assignees.map((c) => ({
                name: c.name,
                id: c.id,
                score: Math.round(c.combined_ranking_score),
                match_percentage: c.match_percentage,
                wellness_score: c.wellness_score,
                wellness_status: c.wellness_status,
                risk: c.wellness_score < 40 ? 'High' : (c.wellness_score < 70 ? 'Medium' : 'Low'),
                matchingSkills: c.matching_skills || [],
                partialMatches: []
            })),
            mlPowered: true
        };
    } catch (error) {
        console.error("Python AI Assignment failed:", error);
        throw error;
    }
}

interface AssignRequest {
    title: string;
    description: string;
    priority: string;
    projectId?: string;
}



// =============================================
// API Route Handler
// =============================================
export async function POST(request: Request) {
    try {
        const body: AssignRequest = await request.json();
        const { title, description } = body;

        const users = await db.getUsers();
        const allTasks = await db.getTasks();

        // Try Python ML-powered assignment
        try {
            // Check ML server availability first
            const isAvailable = await checkMLServerAvailability();
            if (!isAvailable) {
                throw new Error("ML backend is unreachable");
            }

            // Calculate days until due for the Python model
            const daysUntilDue = 7; // Default or calculate from task if available
            const result = await pythonSmartAssignment(users, allTasks, title, description, 'To Do', daysUntilDue);
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
