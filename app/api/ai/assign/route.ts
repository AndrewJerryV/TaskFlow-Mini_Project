import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';

// Heuristic weights
const WEIGHTS = {
    SKILL_MATCH: 50,
    WORKLOAD_PENALTY: 10, // Per active task
    WELLNESS_FACTOR: 0.5, // Multiplier for wellness score
};

interface AssignRequest {
    title: string;
    description: string;
    priority: string;
}

export async function POST(request: Request) {
    try {
        const body: AssignRequest = await request.json();
        const { title, description, priority } = body;

        // 1. Fetch Users and Tasks
        const users = await db.getUsers();
        const allTasks = await db.getTasks();

        // 2. Calculate Stats per User
        const candidates = users.map(user => {
            // A. Workload Analysis
            const activeTasks = allTasks.filter(t =>
                t.assigneeId === user.id &&
                (t.status === 'To Do' || t.status === 'In Progress')
            );
            const taskCount = activeTasks.length;

            // B. Skill Matching (Naive Keyword Search)
            // In a real app, this would use embeddings/LLM
            const taskText = (title + ' ' + description).toLowerCase();
            const userSkills = user.skills || [];
            const matchingSkills = userSkills.filter(skill =>
                taskText.includes(skill.toLowerCase())
            );
            const skillScore = matchingSkills.length > 0 ? WEIGHTS.SKILL_MATCH : 0;

            // C. Health & Burnout Check
            // Simulated wellness score if not present
            const wellness = user.wellnessScore || 80;
            const healthScore = wellness * WEIGHTS.WELLNESS_FACTOR;

            // Calculate Risk
            let burnoutRisk = user.burnoutRisk || 'Low';
            if (taskCount > 4 || wellness < 50) burnoutRisk = 'High';
            else if (taskCount > 2 || wellness < 70) burnoutRisk = 'Medium';

            // D. Final Score
            // Base score based on skills - workload penalty + health boost
            let score = skillScore - (taskCount * WEIGHTS.WORKLOAD_PENALTY) + healthScore;

            // Critical Priority Logic: Prioritize capability over health slightly, but warn
            if (priority === 'Critical' && skillScore > 0) {
                score += 20;
            }

            return {
                user,
                score,
                details: {
                    taskCount,
                    matchingSkills,
                    wellness,
                    burnoutRisk
                }
            };
        });

        // 3. Sort Candidates
        candidates.sort((a, b) => b.score - a.score);

        const bestMatch = candidates[0];

        if (!bestMatch) {
            return NextResponse.json({ error: 'No candidates found' }, { status: 404 });
        }

        // 4. Generate Reasoning
        // 4. Generate Reasoning
        const { user, details } = bestMatch;
        let reason = '';

        if (details.matchingSkills.length > 0) {
            reason = `**${user.name}** is recommended due to their expertise in **${details.matchingSkills.join(', ')}**. `;
        } else {
            reason = `**${user.name}** is the best available candidate for this task. `;
        }

        if (details.burnoutRisk === 'High') {
            reason = `⚠️ However, please note they have a **High Burnout Risk** (${details.taskCount} active tasks).`;
        } else {
            reason += `They have good capacity (${details.taskCount} active tasks) and a healthy wellness score (${details.wellness}%).`;
        }

        return NextResponse.json({
            suggestedUser: user,
            candidateId: user.id,
            reasoning: reason,
            allCandidates: candidates.map(c => ({
                name: c.user.name,
                score: c.score,
                risk: c.details.burnoutRisk
            }))
        });

    } catch (error) {
        console.error('AI Assignment Error:', error);
        return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 });
    }
}
