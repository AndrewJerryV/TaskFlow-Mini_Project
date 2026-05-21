import { Priority, Task, User } from '@/types';

export interface WellnessInput {
    activeTasks: number;
    highPriorityCount: number;
    criticalUrgencyCount: number;
    sensitivity?: number;
}

export interface WellnessResult {
    score: number;
    status: 'Healthy' | 'Warning' | 'Overloaded';
}

export interface AssignmentCandidateResult {
    id?: string;
    name: string;
    match_percentage: number;
    combined_ranking_score: number;
    wellness_score: number;
    wellness_status: string;
    matching_skills: string[];
    missing_skills: string[];
}

export interface AssignmentAnalysis {
    predicted_priority: Priority;
    confidence_score: string;
    urgency_score: number;
    urgency_label: string;
    detected_skills: string[];
}

export interface AssignmentResult {
    analysis: AssignmentAnalysis;
    suggested_assignees: AssignmentCandidateResult[];
}

export interface ClusterTaskInput {
    id: string;
    title: string;
    description?: string;
}

export interface TaskClusterResult {
    taskIds: string[];
    tasks: { id: string; title: string; similarity: number }[];
    size: number;
}

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'build', 'by', 'for', 'from', 'in', 'into', 'is',
    'it', 'of', 'on', 'or', 'task', 'the', 'to', 'update', 'with'
]);

const SKILL_ALIASES: Record<string, string[]> = {
    react: ['react', 'jsx', 'frontend', 'ui', 'component'],
    'next.js': ['next', 'nextjs', 'app router', 'server action'],
    typescript: ['typescript', 'ts', 'type-safe'],
    javascript: ['javascript', 'js'],
    tailwind: ['tailwind', 'css', 'styling', 'responsive'],
    supabase: ['supabase', 'postgres', 'sql', 'database', 'auth', 'rls'],
    python: ['python', 'fastapi', 'ml', 'model', 'inference'],
    testing: ['test', 'testing', 'qa', 'jest', 'playwright', 'unit'],
    api: ['api', 'endpoint', 'backend', 'route', 'integration'],
    design: ['design', 'layout', 'ux', 'visual', 'prototype'],
    devops: ['deploy', 'deployment', 'ci', 'build', 'release'],
};

const PRIORITY_KEYWORDS: Record<Priority, string[]> = {
    Critical: ['critical', 'blocker', 'urgent', 'asap', 'production', 'outage', 'security', 'broken', 'immediately'],
    High: ['important', 'high', 'soon', 'deadline', 'customer', 'failure', 'bug', 'regression'],
    Medium: ['improve', 'support', 'refactor', 'enhance', 'review'],
    Low: ['polish', 'cleanup', 'optional', 'nice to have', 'later'],
};

function normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s+#.-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): string[] {
    return normalize(text)
        .split(' ')
        .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function toTokenSet(text: string): Set<string> {
    return new Set(tokenize(text));
}

function overlapScore(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let matches = 0;
    for (const token of a) {
        if (b.has(token)) matches++;
    }
    return matches / Math.max(Math.sqrt(a.size * b.size), 1);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function titleAndDescription(title: string, description?: string): string {
    return `${title} ${description || ''}`.trim();
}

export function detectSkillsFromText(text: string, skillPool: string[] = []): string[] {
    const normalized = normalize(text);
    const pool = Array.from(new Set([...skillPool, ...Object.keys(SKILL_ALIASES)]));
    const matches = new Set<string>();

    for (const skill of pool) {
        const skillText = skill.toLowerCase();
        if (normalized.includes(skillText)) {
            matches.add(skill);
            continue;
        }

        const aliases = SKILL_ALIASES[skillText] || [];
        if (aliases.some(alias => normalized.includes(alias))) {
            matches.add(skill);
        }
    }

    for (const [skill, aliases] of Object.entries(SKILL_ALIASES)) {
        if (aliases.some(alias => normalized.includes(alias))) {
            matches.add(skill);
        }
    }

    return Array.from(matches).slice(0, 5);
}

export function predictPriority(text: string): { priority: Priority; confidence: number } {
    const normalized = normalize(text);
    const scoreMap: Record<Priority, number> = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
    };

    for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS) as Array<[Priority, string[]]>) {
        for (const keyword of keywords) {
            if (normalized.includes(keyword)) {
                scoreMap[priority] += keyword.includes(' ') ? 1.5 : 1;
            }
        }
    }

    if (/(today|tomorrow|overnight|before launch)/.test(normalized)) {
        scoreMap.High += 1;
    }
    if (/(down|failing|crash|incident|payment|auth)/.test(normalized)) {
        scoreMap.Critical += 1.5;
    }

    let best: Priority = 'Medium';
    let bestScore = -1;
    for (const priority of ['Critical', 'High', 'Medium', 'Low'] as Priority[]) {
        if (scoreMap[priority] > bestScore) {
            best = priority;
            bestScore = scoreMap[priority];
        }
    }

    if (bestScore <= 0) {
        best = normalized.length < 35 ? 'Low' : 'Medium';
        bestScore = 0.75;
    }

    const total = Object.values(scoreMap).reduce((sum, value) => sum + value, 0);
    const confidence = total > 0 ? clamp(bestScore / total, 0.45, 0.96) : 0.58;
    return { priority: best, confidence };
}

export function calculateUrgency(priority: string, status: string, daysUntilDue: number, daysSinceUpdate: number): number {
    const priorityScores: Record<string, number> = { Critical: 55, High: 40, Medium: 25, Low: 10 };
    const statusMultiplier: Record<string, number> = { 'To Do': 1.15, 'In Progress': 1, Review: 0.7, Done: 0 };

    let score = priorityScores[priority] ?? 20;

    if (daysUntilDue <= 0) {
        score += 30 + Math.abs(daysUntilDue) * 6;
    } else if (daysUntilDue <= 3) {
        score += (4 - daysUntilDue) * 8;
    } else if (daysUntilDue <= 7) {
        score += (8 - daysUntilDue) * 3;
    }

    if (daysSinceUpdate > 3) {
        score += Math.min((daysSinceUpdate - 2) * 3, 18);
    }

    return Math.round(score * (statusMultiplier[status] ?? 1));
}

export function urgencyLabel(score: number): string {
    if (score === 0) return 'Completed';
    if (score >= 85) return 'Critical';
    if (score >= 55) return 'High';
    if (score >= 30) return 'Moderate';
    return 'Low';
}

export function analyzeWellness(input: WellnessInput): WellnessResult {
    const sensitivity = clamp(input.sensitivity ?? 1, 0.6, 1.5);
    const overloadPenalty =
        input.activeTasks * 7 +
        input.highPriorityCount * 9 +
        input.criticalUrgencyCount * 14;

    const score = clamp(Math.round(100 - overloadPenalty * sensitivity), 5, 100);
    const status = score >= 75 ? 'Healthy' : score >= 50 ? 'Warning' : 'Overloaded';
    return { score, status };
}

function scoreCandidate(taskText: string, requiredSkills: string[], candidate: User, wellness: WellnessResult): AssignmentCandidateResult {
    const candidateSkills = candidate.skills || [];
    const taskTokens = toTokenSet(taskText);
    const matchingSkills = candidateSkills.filter(skill =>
        requiredSkills.some(required => required.toLowerCase() === skill.toLowerCase())
    );

    const candidateSkillTokens = new Set(candidateSkills.flatMap(skill => tokenize(skill)));
    const semanticScore = overlapScore(taskTokens, candidateSkillTokens);
    const requiredMatch = requiredSkills.length === 0 ? semanticScore * 100 : (matchingSkills.length / requiredSkills.length) * 100;

    let combined = requiredMatch * 0.65 + semanticScore * 25 + wellness.score * 0.35;

    if (candidate.role === 'Admin') combined *= 0.88;
    if (candidate.role === 'Manager') combined *= 0.94;
    if (candidate.role === 'Member') combined *= 1.05;

    return {
        id: candidate.id,
        name: candidate.name,
        match_percentage: Math.round(clamp(requiredMatch, 0, 100)),
        combined_ranking_score: Math.round(clamp(combined, 0, 100)),
        wellness_score: wellness.score,
        wellness_status: wellness.status,
        matching_skills: matchingSkills,
        missing_skills: requiredSkills.filter(required =>
            !candidateSkills.some(skill => skill.toLowerCase() === required.toLowerCase())
        ),
    };
}

export function assignTaskWithEngine(input: {
    title: string;
    description?: string;
    status: string;
    daysUntilDue: number;
    daysSinceUpdate?: number;
    candidates: Array<Pick<User, 'id' | 'name' | 'role' | 'skills' | 'burnoutSensitivity'> & {
        wellness_data?: {
            active_tasks: number;
            high_priority_count: number;
            critical_urgency_count: number;
        };
    }>;
}): AssignmentResult {
    const taskText = titleAndDescription(input.title, input.description);
    const skillPool = input.candidates.flatMap(candidate => candidate.skills || []);
    const requiredSkills = detectSkillsFromText(taskText, skillPool);
    const { priority, confidence } = predictPriority(taskText);
    const urgencyScore = calculateUrgency(priority, input.status, input.daysUntilDue, input.daysSinceUpdate ?? 0);

    const suggested_assignees = input.candidates
        .map(candidate => {
            const wellnessInput = candidate.wellness_data || {
                active_tasks: 0,
                high_priority_count: 0,
                critical_urgency_count: 0,
            };

            const wellness = analyzeWellness({
                activeTasks: wellnessInput.active_tasks,
                highPriorityCount: wellnessInput.high_priority_count,
                criticalUrgencyCount: wellnessInput.critical_urgency_count,
                sensitivity: candidate.burnoutSensitivity,
            });

            return scoreCandidate(taskText, requiredSkills, candidate as User, wellness);
        })
        .sort((a, b) => b.combined_ranking_score - a.combined_ranking_score)
        .slice(0, 5);

    return {
        analysis: {
            predicted_priority: priority,
            confidence_score: `${Math.round(confidence * 100)}%`,
            urgency_score: urgencyScore,
            urgency_label: urgencyLabel(urgencyScore),
            detected_skills: requiredSkills,
        },
        suggested_assignees,
    };
}

export function batchPriorityCheck(tasks: Array<{ id: string; description: string }>) {
    return {
        predictions: tasks.map(task => {
            const result = predictPriority(task.description);
            return {
                id: task.id,
                predicted_priority: result.priority,
                confidence: Number(result.confidence.toFixed(3)),
            };
        })
    };
}

export function clusterTasksWithEngine(tasks: ClusterTaskInput[]): { clusters: TaskClusterResult[] } {
    if (tasks.length < 2) return { clusters: [] };

    const taskTokens = tasks.map(task => toTokenSet(titleAndDescription(task.title, task.description)));
    const visited = new Set<number>();
    const clusters: TaskClusterResult[] = [];

    for (let i = 0; i < tasks.length; i++) {
        if (visited.has(i)) continue;

        const group = [i];
        for (let j = i + 1; j < tasks.length; j++) {
            if (visited.has(j)) continue;
            const similarity = overlapScore(taskTokens[i], taskTokens[j]);
            if (similarity >= 0.34) {
                group.push(j);
            }
        }

        if (group.length >= 2) {
            group.forEach(index => visited.add(index));
            const clusterTasks = group.map(index => ({
                id: tasks[index].id,
                title: tasks[index].title,
                similarity: Number(overlapScore(taskTokens[i], taskTokens[index]).toFixed(2)),
            }));

            clusters.push({
                taskIds: group.map(index => tasks[index].id),
                tasks: clusterTasks,
                size: group.length,
            });
        }
    }

    clusters.sort((a, b) => b.size - a.size);
    return { clusters: clusters.slice(0, 5) };
}

export function getTaskLoadStats(tasks: Task[], userId: string) {
    const activeTasks = tasks.filter(task => task.assigneeId === userId && task.status !== 'Done');
    const highPriorityCount = activeTasks.filter(task => task.priority === 'High').length;
    const criticalUrgencyCount = activeTasks.filter(task => {
        if (task.priority === 'Critical') return true;
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < new Date();
    }).length;

    return {
        activeTasks,
        activeCount: activeTasks.length,
        highPriorityCount,
        criticalUrgencyCount,
    };
}
