import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task } from '@/types';
import { calculateSkillMatch, isMLAvailable } from '@/lib/ml-engine';

// =============================================
// Fallback: Original heuristic assignment
// =============================================
const WEIGHTS = {
    SKILL_MATCH: 40,
    SKILL_PARTIAL_MATCH: 15,
    WORKLOAD_PENALTY: 8,
    WELLNESS_FACTOR: 0.4,
    PRIORITY_BONUS: 25,
    AVAILABILITY_BONUS: 15,
};

const SKILL_SYNONYMS: Record<string, string[]> = {
    'frontend': ['ui', 'ux', 'react', 'vue', 'angular', 'css', 'html', 'javascript', 'typescript', 'web', 'interface', 'design'],
    'backend': ['api', 'server', 'node', 'python', 'java', 'database', 'sql', 'rest', 'graphql', 'microservices'],
    'design': ['ui', 'ux', 'figma', 'sketch', 'prototype', 'wireframe', 'visual', 'graphics', 'creative'],
    'database': ['sql', 'postgres', 'mysql', 'mongodb', 'data', 'schema', 'query', 'storage'],
    'devops': ['ci', 'cd', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'deployment', 'infrastructure'],
    'testing': ['qa', 'test', 'automation', 'selenium', 'jest', 'cypress', 'quality'],
    'ai': ['machine learning', 'ml', 'deep learning', 'neural', 'nlp', 'model', 'training', 'prediction'],
    'machine learning': ['ai', 'ml', 'deep learning', 'neural', 'model', 'training', 'data science'],
    'python': ['django', 'flask', 'pandas', 'numpy', 'scripting'],
    'react': ['frontend', 'javascript', 'typescript', 'hooks', 'components', 'redux', 'nextjs'],
    'product': ['planning', 'roadmap', 'requirements', 'stakeholder', 'strategy', 'management'],
};

const PRIORITY_WEIGHT: Record<string, number> = {
    'Critical': 3,
    'High': 2,
    'Medium': 1.5,
    'Low': 1,
};

interface AssignRequest {
    title: string;
    description: string;
    priority: string;
    projectId?: string;
}

function extractKeywords(text: string): string[] {
    const normalized = text.toLowerCase();
    const words = normalized.split(/[\s,.\-_:;!?()[\]{}]+/)
        .filter(word => word.length > 2);
    return [...new Set(words)];
}

function getSkillMatchScore(skill: string, taskKeywords: string[], taskText: string): number {
    const skillLower = skill.toLowerCase();

    if (taskKeywords.includes(skillLower)) return WEIGHTS.SKILL_MATCH;
    if (taskText.includes(skillLower)) return WEIGHTS.SKILL_MATCH;

    const synonyms = SKILL_SYNONYMS[skillLower] || [];
    for (const synonym of synonyms) {
        if (taskKeywords.includes(synonym) || taskText.includes(synonym)) {
            return WEIGHTS.SKILL_PARTIAL_MATCH;
        }
    }

    for (const [key, syns] of Object.entries(SKILL_SYNONYMS)) {
        if (syns.includes(skillLower) && (taskKeywords.includes(key) || taskText.includes(key))) {
            return WEIGHTS.SKILL_PARTIAL_MATCH;
        }
    }

    for (const keyword of taskKeywords) {
        if (skillLower.includes(keyword) || keyword.includes(skillLower)) {
            return WEIGHTS.SKILL_PARTIAL_MATCH * 0.5;
        }
    }

    return 0;
}

function calculateWeightedWorkload(tasks: Task[]): number {
    return tasks.reduce((total, task) => {
        const weight = PRIORITY_WEIGHT[task.priority] || 1;
        return total + weight;
    }, 0);
}

function fallbackAssignment(users: User[], allTasks: Task[], title: string, description: string, priority: string) {
    const taskText = (title + ' ' + (description || '')).toLowerCase();
    const taskKeywords = extractKeywords(title + ' ' + (description || ''));

    const candidates = users.map(user => {
        const activeTasks = allTasks.filter(t =>
            t.assigneeId === user.id &&
            (t.status === 'To Do' || t.status === 'In Progress')
        );
        const taskCount = activeTasks.length;
        const weightedWorkload = calculateWeightedWorkload(activeTasks);

        const userSkills = user.skills || [];
        let totalSkillScore = 0;
        const matchingSkills: string[] = [];
        const partialMatches: string[] = [];

        for (const skill of userSkills) {
            const matchScore = getSkillMatchScore(skill, taskKeywords, taskText);
            if (matchScore >= WEIGHTS.SKILL_MATCH) {
                matchingSkills.push(skill);
                totalSkillScore += matchScore;
            } else if (matchScore > 0) {
                partialMatches.push(skill);
                totalSkillScore += matchScore;
            }
        }

        const wellness = user.wellnessScore || 80;
        const healthScore = wellness * WEIGHTS.WELLNESS_FACTOR;

        const maxWorkload = user.maxWorkload || 5;
        const isUnderCapacity = taskCount < maxWorkload;
        const availabilityBonus = isUnderCapacity ? WEIGHTS.AVAILABILITY_BONUS : 0;

        let burnoutRisk: 'Low' | 'Medium' | 'High' = 'Low';
        if (taskCount >= maxWorkload || wellness < 50) burnoutRisk = 'High';
        else if (taskCount >= maxWorkload - 1 || wellness < 70) burnoutRisk = 'Medium';

        let score = totalSkillScore
            - (weightedWorkload * WEIGHTS.WORKLOAD_PENALTY)
            + healthScore
            + availabilityBonus;

        if (priority === 'Critical' && matchingSkills.length > 0) {
            score += WEIGHTS.PRIORITY_BONUS;
        }

        if (user.autoAssign === true) {
            score += 5;
        }

        return {
            user,
            score,
            details: {
                taskCount,
                weightedWorkload: Math.round(weightedWorkload * 10) / 10,
                matchingSkills,
                partialMatches,
                allSkills: userSkills,
                wellness,
                burnoutRisk,
                isUnderCapacity,
                maxWorkload
            }
        };
    });

    candidates.sort((a, b) => b.score - a.score);
    const bestMatch = candidates[0];

    if (!bestMatch) {
        return { error: 'No candidates found' };
    }

    const { user, details } = bestMatch;
    let reason = '';

    if (details.matchingSkills.length > 0) {
        reason = `**${user.name}** is recommended due to their expertise in **${details.matchingSkills.join(', ')}**. `;
    } else if (details.partialMatches.length > 0) {
        reason = `**${user.name}** has related skills (**${details.partialMatches.join(', ')}**) that align with this task. `;
    } else {
        reason = `**${user.name}** is the best available candidate based on current workload. `;
    }

    if (details.isUnderCapacity) {
        reason += `They have capacity (${details.taskCount}/${details.maxWorkload} active tasks). `;
    } else {
        reason += `Note: They are at capacity (${details.taskCount}/${details.maxWorkload} tasks). `;
    }

    if (details.burnoutRisk === 'High') {
        reason = `⚠️ **Warning**: ${user.name} has a **High Burnout Risk** (${details.taskCount} active tasks, wellness: ${details.wellness}%). Consider distributing workload. ` + reason;
    } else if (details.burnoutRisk === 'Medium') {
        reason += `⚡ Moderate workload - monitor capacity.`;
    } else {
        reason += `Wellness score: ${details.wellness}%.`;
    }

    return {
        suggestedUser: user,
        candidateId: user.id,
        reasoning: reason,
        allCandidates: candidates.map(c => ({
            name: c.user.name,
            id: c.user.id,
            score: Math.round(c.score),
            risk: c.details.burnoutRisk,
            taskCount: c.details.taskCount,
            matchingSkills: c.details.matchingSkills,
            partialMatches: c.details.partialMatches
        })),
        mlPowered: false
    };
}

// =============================================
// Local ML-powered smart assignment
// =============================================
async function localSmartAssignment(users: User[], allTasks: Task[], title: string, description: string, priority: string) {
    const taskText = title + " " + description;

    // Process each candidate through ML model
    const candidates = users.map(user => {
        // 1. Skill Match (TF-IDF Cosine Similarity)
        // Returns 0-1
        const rawSimilarity = calculateSkillMatch(taskText, user.skills || []);
        const skillScore = rawSimilarity * 100; // Scale to 0-100

        // 2. Workload Analysis
        const activeTasks = allTasks.filter(t => t.assigneeId === user.id && t.status !== 'Done');
        const workloadCount = activeTasks.length;
        const maxWorkload = user.maxWorkload || 5;
        const isOverloaded = workloadCount >= maxWorkload;

        // 3. Wellness
        const wellness = user.wellnessScore || 80;

        // 4. Scoring Formula
        // Base: Skill (50%) + Wellness (30%) + Capacity (20%)
        let score = (skillScore * 0.6) + (wellness * 0.2);

        if (!isOverloaded) score += 20;
        else score -= 20; // Penalty for being overloaded

        if (priority === 'Critical' && skillScore > 50) score += 15; // Critical tasks need skills foremost

        return {
            user,
            score,
            rawSimilarity,
            workloadCount,
            maxWorkload,
            wellness,
            isOverloaded,
            burnoutRisk: (workloadCount >= maxWorkload || wellness < 60) ? 'High' : (workloadCount >= maxWorkload - 1 ? 'Medium' : 'Low')
        };
    });

    // Sort
    candidates.sort((a, b) => b.score - a.score);
    const bestMatch = candidates[0];

    if (!bestMatch) {
        throw new Error("No candidates processed");
    }

    // Generate reasoning
    const { user, rawSimilarity, workloadCount, maxWorkload, isOverloaded } = bestMatch;
    let reasoning = `**${user.name}** is the top AI match with **${Math.round(rawSimilarity * 100)}% skill alignment** for this task. `;

    if (rawSimilarity > 0.1) {
        reasoning += `Their skills (${user.skills?.slice(0, 3).join(', ')}) fit the task content well. `;
    } else {
        reasoning += `General aptitude match based on task history. `;
    }

    if (!isOverloaded) {
        reasoning += `They have availability (${workloadCount}/${maxWorkload} tasks).`;
    } else {
        reasoning += `Note: They are currently at capacity (${workloadCount}/${maxWorkload}).`;
    }

    if (bestMatch.burnoutRisk === 'High') {
        reasoning = `⚠️ **Burnout Risk**: ${user.name} is overloaded, but is the only strong skill match. Consider delaying classification or pairing. ` + reasoning;
    }

    return {
        suggestedUser: user,
        candidateId: user.id,
        reasoning,
        allCandidates: candidates.map(c => ({
            name: c.user.name,
            id: c.user.id,
            score: Math.round(c.score),
            risk: c.burnoutRisk,
            taskCount: c.workloadCount,
            matchingSkills: c.user.skills || [], // We don't have per-word matching in TF-IDF, so show all skills
            partialMatches: []
        })),
        mlPowered: true
    };
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

        // Try ML-powered assignment
        if (isMLAvailable()) {
            try {
                const result = await localSmartAssignment(users, allTasks, title, description, priority);
                return NextResponse.json(result);
            } catch (error) {
                console.error('ML assignment failed, falling back to heuristic:', error);
            }
        }

        // Fallback
        const result = fallbackAssignment(users, allTasks, title, description, priority);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }
        return NextResponse.json(result);
    } catch (error) {
        console.error('AI Assignment Error:', error);
        return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 });
    }
}
