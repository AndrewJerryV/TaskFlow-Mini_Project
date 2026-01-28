import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, Task, Priority } from '@/types';

// Heuristic weights
const WEIGHTS = {
    SKILL_MATCH: 40,           // Base score per matching skill
    SKILL_PARTIAL_MATCH: 15,   // Partial/synonym match
    WORKLOAD_PENALTY: 8,       // Per weighted task
    WELLNESS_FACTOR: 0.4,      // Multiplier for wellness score
    PRIORITY_BONUS: 25,        // Bonus for critical tasks with skill match
    AVAILABILITY_BONUS: 15,    // Bonus for users under max workload
};

// Skill synonyms and related terms for better matching
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

// Priority weights for workload calculation
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
}

// Extract keywords from task text
function extractKeywords(text: string): string[] {
    const normalized = text.toLowerCase();
    // Split by common delimiters and filter out short words
    const words = normalized.split(/[\s,.\-_:;!?()[\]{}]+/)
        .filter(word => word.length > 2);
    return [...new Set(words)];
}

// Check if a skill matches the task (exact, partial, or synonym)
function getSkillMatchScore(skill: string, taskKeywords: string[], taskText: string): number {
    const skillLower = skill.toLowerCase();

    // Exact match in keywords
    if (taskKeywords.includes(skillLower)) {
        return WEIGHTS.SKILL_MATCH;
    }

    // Check if skill appears in full text (allows multi-word skills)
    if (taskText.includes(skillLower)) {
        return WEIGHTS.SKILL_MATCH;
    }

    // Check synonyms
    const synonyms = SKILL_SYNONYMS[skillLower] || [];
    for (const synonym of synonyms) {
        if (taskKeywords.includes(synonym) || taskText.includes(synonym)) {
            return WEIGHTS.SKILL_PARTIAL_MATCH;
        }
    }

    // Check if this skill is a synonym of something in the task
    for (const [key, syns] of Object.entries(SKILL_SYNONYMS)) {
        if (syns.includes(skillLower) && (taskKeywords.includes(key) || taskText.includes(key))) {
            return WEIGHTS.SKILL_PARTIAL_MATCH;
        }
    }

    // Partial match (skill is substring of keyword or vice versa)
    for (const keyword of taskKeywords) {
        if (skillLower.includes(keyword) || keyword.includes(skillLower)) {
            return WEIGHTS.SKILL_PARTIAL_MATCH * 0.5;
        }
    }

    return 0;
}

// Calculate weighted workload based on task priorities
function calculateWeightedWorkload(tasks: Task[]): number {
    return tasks.reduce((total, task) => {
        const weight = PRIORITY_WEIGHT[task.priority] || 1;
        return total + weight;
    }, 0);
}

export async function POST(request: Request) {
    try {
        const body: AssignRequest = await request.json();
        const { title, description, priority } = body;

        // 1. Fetch Users and Tasks
        const users = await db.getUsers();
        const allTasks = await db.getTasks();

        const taskText = (title + ' ' + (description || '')).toLowerCase();
        const taskKeywords = extractKeywords(title + ' ' + (description || ''));

        // 2. Calculate Stats per User
        const candidates = users.map(user => {
            // A. Workload Analysis with priority weighting
            const activeTasks = allTasks.filter(t =>
                t.assigneeId === user.id &&
                (t.status === 'To Do' || t.status === 'In Progress')
            );
            const taskCount = activeTasks.length;
            const weightedWorkload = calculateWeightedWorkload(activeTasks);

            // B. Enhanced Skill Matching
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

            // C. Health & Burnout Check
            const wellness = user.wellnessScore || 80;
            const healthScore = wellness * WEIGHTS.WELLNESS_FACTOR;

            // D. Availability Check
            const maxWorkload = user.maxWorkload || 5;
            const isUnderCapacity = taskCount < maxWorkload;
            const availabilityBonus = isUnderCapacity ? WEIGHTS.AVAILABILITY_BONUS : 0;

            // Calculate Burnout Risk
            let burnoutRisk: 'Low' | 'Medium' | 'High' = 'Low';
            if (taskCount >= maxWorkload || wellness < 50) burnoutRisk = 'High';
            else if (taskCount >= maxWorkload - 1 || wellness < 70) burnoutRisk = 'Medium';

            // E. Final Score Calculation
            let score = totalSkillScore
                - (weightedWorkload * WEIGHTS.WORKLOAD_PENALTY)
                + healthScore
                + availabilityBonus;

            // Critical Priority Logic: Boost skilled candidates for urgent tasks
            if (priority === 'Critical' && matchingSkills.length > 0) {
                score += WEIGHTS.PRIORITY_BONUS;
            }

            // Preference for users with auto-assign enabled
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

        // 3. Sort Candidates by score
        candidates.sort((a, b) => b.score - a.score);

        const bestMatch = candidates[0];

        if (!bestMatch) {
            return NextResponse.json({ error: 'No candidates found' }, { status: 404 });
        }

        // 4. Generate Detailed Reasoning
        const { user, details } = bestMatch;
        let reason = '';

        // Skill-based reasoning
        if (details.matchingSkills.length > 0) {
            reason = `**${user.name}** is recommended due to their expertise in **${details.matchingSkills.join(', ')}**. `;
        } else if (details.partialMatches.length > 0) {
            reason = `**${user.name}** has related skills (**${details.partialMatches.join(', ')}**) that align with this task. `;
        } else {
            reason = `**${user.name}** is the best available candidate based on current workload. `;
        }

        // Workload and capacity info
        if (details.isUnderCapacity) {
            reason += `They have capacity (${details.taskCount}/${details.maxWorkload} active tasks). `;
        } else {
            reason += `Note: They are at capacity (${details.taskCount}/${details.maxWorkload} tasks). `;
        }

        // Burnout warning
        if (details.burnoutRisk === 'High') {
            reason = `⚠️ **Warning**: ${user.name} has a **High Burnout Risk** (${details.taskCount} active tasks, wellness: ${details.wellness}%). Consider distributing workload. ` + reason;
        } else if (details.burnoutRisk === 'Medium') {
            reason += `⚡ Moderate workload - monitor capacity.`;
        } else {
            reason += `Wellness score: ${details.wellness}%.`;
        }

        return NextResponse.json({
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
            }))
        });

    } catch (error) {
        console.error('AI Assignment Error:', error);
        return NextResponse.json({ error: 'Failed to assign task' }, { status: 500 });
    }
}
