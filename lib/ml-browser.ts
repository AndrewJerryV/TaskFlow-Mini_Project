import { User } from '@/types';
import { assignTaskWithEngine, detectSkillsFromText, predictPriority } from '@/lib/ml-engine';

export interface BrowserTaskDraftInsight {
    predictedPriority: 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: number;
    detectedSkills: string[];
    topCandidateId?: string;
    topCandidateName?: string;
}

export function analyzeTaskDraftInBrowser(input: {
    title: string;
    description?: string;
    users?: User[];
}): BrowserTaskDraftInsight | null {
    const title = input.title.trim();
    const description = input.description?.trim() || '';

    if (!title && !description) return null;

    const combined = `${title} ${description}`.trim();
    const priority = predictPriority(combined);
    const skillPool = (input.users || []).flatMap(user => user.skills || []);
    const detectedSkills = detectSkillsFromText(combined, skillPool);

    if (!input.users || input.users.length === 0) {
        return {
            predictedPriority: priority.priority,
            confidence: priority.confidence,
            detectedSkills,
        };
    }

    const assignment = assignTaskWithEngine({
        title,
        description,
        status: 'To Do',
        daysUntilDue: 7,
        candidates: input.users.map(user => ({
            id: user.id,
            name: user.name,
            role: user.role,
            skills: user.skills,
            burnoutSensitivity: user.burnoutSensitivity,
            wellness_data: {
                active_tasks: 0,
                high_priority_count: 0,
                critical_urgency_count: 0,
            },
        })),
    });

    const topCandidate = assignment.suggested_assignees[0];

    return {
        predictedPriority: priority.priority,
        confidence: priority.confidence,
        detectedSkills,
        topCandidateId: topCandidate?.id,
        topCandidateName: topCandidate?.name,
    };
}
