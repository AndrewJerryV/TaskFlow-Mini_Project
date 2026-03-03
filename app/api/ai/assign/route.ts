import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';
import { checkMLServerAvailability } from '@/lib/utils';

// Heuristic fallback logic removed to simplify project complexity.
// The system now relies exclusively on the Python ML server.
// If the server is offline, the UI handles the unavailability state.

// =============================================
// Smart assignment calling Python ML server
// =============================================
async function pythonSmartAssignment(users: User[], allTasks: Task[], title: string, description: string, status: string, daysUntilDue: number) {
    try {
        const payload = {
            description: title + " " + (description || ""),
            status: status,
            days_until_due: daysUntilDue,
            days_since_update: 0, // Could be calculated if needed
            candidates: users.map(u => ({
                id: u.id,
                name: u.name,
                skills: u.skills || []
            }))
        };

        const response = await fetch('http://127.0.0.1:8000/analyze_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Python ML server responded with ${response.status}`);
        }

        const data = await response.json();
        const bestMatch = data.suggested_assignees[0];

        if (!bestMatch) {
            throw new Error("No suggestions returned from Python ML server");
        }

        // Find the user object for the suggested assignee
        const suggestedUser = users.find(u => u.id === bestMatch.id) || users.find(u => u.name === bestMatch.name);

        if (!suggestedUser) {
            throw new Error("Suggested user not found in database");
        }

        // Generate reasoning based on ML results
        let reasoning = `**${suggestedUser.name}** is the top AI match with **${bestMatch.match_percentage}% skill alignment**. `;

        if (bestMatch.matching_skills && bestMatch.matching_skills.length > 0) {
            reasoning += `Their skills in **${bestMatch.matching_skills.slice(0, 3).join(', ')}** strongly match the task content. `;
        }

        reasoning += `\n\n*Analysis powered by Sentence Transformers semantic matching.*`;

        return {
            suggestedUser,
            candidateId: suggestedUser.id,
            reasoning,
            allCandidates: data.suggested_assignees.map((c: any) => ({
                name: c.name,
                id: c.id,
                score: Math.round(c.match_percentage),
                risk: 'Low', // Python server doesn't calculate risk yet, could be expanded
                taskCount: users.find(u => u.id === c.id || u.name === c.name)?.wellnessScore, // Temporary use of wellness
                matchingSkills: c.matching_skills || [],
                partialMatches: []
            })),
            mlPowered: true
        };
    } catch (error) {
        console.error("Python AI Assignment failed:", error);
        throw error; // Let the caller handle fallback
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
        const { title, description, priority, projectId } = body;

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
        } catch (error: any) {
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
