/**
 * ML Transformers Service — runs all-MiniLM-L6-v2 sentence-transformer and
 * mobilebert-uncased-mnli zero-shot classification via @xenova/transformers
 * (ONNX Runtime).  Same models as the Python backend.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { pipeline, env } from '@xenova/transformers';

// Cache models in /tmp so they persist between Vercel warm starts
env.allowLocalModels = false;
env.cacheDir = '/tmp/.cache';

/* ---------- singletons (lazy init) ---------- */
let embeddingPipeline: any = null;
let classifierPipeline: any = null;

async function getEmbeddingPipeline() {
    if (!embeddingPipeline) {
        console.log('[ML] Loading all-MiniLM-L6-v2 embedding model…');
        embeddingPipeline = await pipeline(
            'feature-extraction',
            'Xenova/all-MiniLM-L6-v2',
            { quantized: true },
        );
        console.log('[ML] Embedding model ready.');
    }
    return embeddingPipeline;
}

async function getClassifierPipeline() {
    if (!classifierPipeline) {
        console.log('[ML] Loading zero-shot classification model…');
        classifierPipeline = await pipeline(
            'zero-shot-classification',
            'Xenova/mobilebert-uncased-mnli',
            { quantized: true },
        );
        console.log('[ML] Classifier model ready.');
    }
    return classifierPipeline;
}

/* ---------- helpers ---------- */
function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

/* ────────────────────────────────────────────────────────────────
   Keyword aliases — identical to the Python models.py version
   ──────────────────────────────────────────────────────────────── */
const SKILL_ALIASES: Record<string, string[]> = {
    website: ['html5', 'react', 'next.js', 'frontend', 'javascript', 'vue', 'angular'],
    ui:      ['react', 'frontend', 'figma', 'tailwind css', 'framer motion', 'css'],
    color:   ['tailwind css', 'css', 'frontend', 'framer motion'],
    style:   ['tailwind css', 'css', 'frontend'],
    button:  ['react', 'frontend', 'tailwind css', 'html5'],
    database:['mongodb', 'postgresql', 'sql', 'prisma', 'mongoose', 'supabase'],
    auth:    ['firebase', 'supabase', 'next-auth', 'jwt'],
    login:   ['firebase', 'supabase', 'next-auth', 'jwt', 'react'],
};

/* ────────────────────────────────────────────────────────────────
   1. Semantic Skill Matching  (mirrors Python TaskAssigner)
   ──────────────────────────────────────────────────────────────── */
export async function semanticSkillMatch(
    taskText: string,
    allSkills: string[],
    maxSkills = 5,
    minGap = 0.10,
): Promise<{ requiredSkills: string[]; scores: { skill: string; score: number }[] }> {
    if (allSkills.length === 0) return { requiredSkills: [], scores: [] };

    const extractor = await getEmbeddingPipeline();

    // Encode task text
    const taskEmb = await extractor(taskText, { pooling: 'mean', normalize: true });
    const taskVec: number[] = Array.from(taskEmb.data as Float32Array);

    // Encode each skill
    const skillVecs: number[][] = [];
    for (const skill of allSkills) {
        const emb = await extractor(skill, { pooling: 'mean', normalize: true });
        skillVecs.push(Array.from(emb.data as Float32Array));
    }

    // Semantic similarity
    const semanticScores = skillVecs.map(sv => cosineSimilarity(taskVec, sv));

    // Keyword boosting (matches Python logic)
    const taskLower = taskText.toLowerCase();
    const keywordScores = allSkills.map(skill => {
        const sl = skill.toLowerCase();
        let score = 0;

        // Direct match
        if (taskLower.includes(sl)) {
            score = 1.0;
        } else if (sl.includes(' ')) {
            const parts = sl.split(' ');
            if (parts.some(p => p.length > 2 && taskLower.includes(p))) {
                score = 0.5;
            }
        }

        // Alias match
        for (const [word, aliasList] of Object.entries(SKILL_ALIASES)) {
            if (taskLower.includes(word) && aliasList.map(a => a.toLowerCase()).includes(sl)) {
                score = Math.max(score, 0.8);
            }
        }
        return score;
    });

    // Combined: semantic + keyword boost (same formula as Python)
    const finalScores = semanticScores.map((s, i) => ({
        skill: allSkills[i],
        score: s + keywordScores[i] * 0.6,
    }));

    // Sort descending
    finalScores.sort((a, b) => b.score - a.score);

    // Natural-gap cutoff (same algorithm as Python)
    const top = finalScores.slice(0, maxSkills * 2);
    let bestCut = top.length;
    let maxDrop = 0;
    for (let i = 1; i < top.length; i++) {
        const drop = top[i - 1].score - top[i].score;
        if (drop > maxDrop && drop >= minGap) {
            maxDrop = drop;
            bestCut = i;
        }
    }

    let requiredSkills = top.slice(0, bestCut).map(t => t.skill).slice(0, maxSkills);
    if (requiredSkills.length === 0) {
        requiredSkills = finalScores.slice(0, 3).map(t => t.skill);
    }

    return { requiredSkills, scores: finalScores };
}

/* ────────────────────────────────────────────────────────────────
   2. Priority Prediction (zero-shot classification)
   ──────────────────────────────────────────────────────────────── */
export async function predictPriorityML(
    taskText: string,
): Promise<{ priority: string; confidence: number }> {
    const classifier = await getClassifierPipeline();

    const result = await classifier(taskText, [
        'critical urgent priority task',
        'high priority important task',
        'medium priority normal task',
        'low priority minor task',
    ]);

    const labelMap: Record<string, string> = {
        'critical urgent priority task': 'Critical',
        'high priority important task': 'High',
        'medium priority normal task': 'Medium',
        'low priority minor task': 'Low',
    };

    const topLabel = result.labels[0] as string;
    const topScore = result.scores[0] as number;

    return {
        priority: labelMap[topLabel] || 'Medium',
        confidence: topScore,
    };
}

/* ────────────────────────────────────────────────────────────────
   3. Wellness Model (exact port of Python WellnessModel)
   ──────────────────────────────────────────────────────────────── */
const COMFORTABLE_LOAD = 4;
const PENALTY_PER_EXTRA_TASK = 5;
const PENALTY_HIGH_PRIORITY = 8;
const PENALTY_CRITICAL_URGENCY = 15;
const PENALTY_CONTEXT_SWITCH = 2;

export function calculateWellness(
    activeTasks: number,
    highPriorityCount: number,
    criticalUrgencyCount: number,
): number {
    let score = 100;
    if (activeTasks > COMFORTABLE_LOAD) {
        const extra = activeTasks - COMFORTABLE_LOAD;
        score -= extra * PENALTY_PER_EXTRA_TASK;
        score -= extra * PENALTY_CONTEXT_SWITCH;
    }
    score -= highPriorityCount * PENALTY_HIGH_PRIORITY;
    score -= criticalUrgencyCount * PENALTY_CRITICAL_URGENCY;
    return Math.max(0, Math.min(100, score));
}

export function wellnessStatus(score: number): string {
    if (score >= 80) return 'Healthy Balance';
    if (score >= 60) return 'Nearing Capacity';
    if (score >= 35) return 'Overworked';
    return 'Burnout Risk';
}

/* ────────────────────────────────────────────────────────────────
   4. Full Assignment Pipeline  (mirrors Python /analyze_task)
   ──────────────────────────────────────────────────────────────── */
export interface CandidateInput {
    id: string;
    name: string;
    role: string;
    skills: string[];
    wellness_data?: {
        active_tasks: number;
        high_priority_count: number;
        critical_urgency_count: number;
    };
}

export interface RankedCandidate {
    id: string;
    name: string;
    match_percentage: number;
    combined_ranking_score: number;
    wellness_score: number;
    wellness_status: string;
    matching_skills: string[];
    missing_skills: string[];
}

export interface AssignmentResult {
    analysis: {
        predicted_priority: string;
        confidence_score: string;
        urgency_score: number;
        urgency_label: string;
        detected_skills: string[];
    };
    suggested_assignees: RankedCandidate[];
}

export async function analyzeAndAssignTask(
    taskText: string,
    status: string,
    daysUntilDue: number,
    daysSinceUpdate: number,
    candidates: CandidateInput[],
): Promise<AssignmentResult> {
    // 1. Predict priority via zero-shot classification
    const { priority, confidence } = await predictPriorityML(taskText);

    // 2. Urgency scoring (same formula as Python UrgencyModel)
    const PRIORITY_SCORES: Record<string, number> = { High: 40, Medium: 20, Low: 10, Critical: 55 };
    const STATUS_MULTIPLIERS: Record<string, number> = { 'To Do': 1.2, 'In Progress': 1.0, 'In Review': 0.5, Done: 0.0 };
    let urgencyScore = PRIORITY_SCORES[priority] ?? 10;
    if (daysUntilDue <= 0) urgencyScore += 50 + Math.abs(daysUntilDue) * 10;
    else if (daysUntilDue <= 7) urgencyScore += (7 - daysUntilDue) * 5;
    if (daysSinceUpdate > 3) urgencyScore += (daysSinceUpdate - 3) * 2;
    urgencyScore = Math.round(urgencyScore * (STATUS_MULTIPLIERS[status] ?? 1.0));

    const urgencyLabel = urgencyScore === 0 ? 'Completed'
        : urgencyScore >= 80 ? 'Critical'
        : urgencyScore >= 50 ? 'High'
        : urgencyScore >= 30 ? 'Moderate'
        : 'Low';

    // 3. Semantic skill matching
    const allSkills = [...new Set(candidates.flatMap(c => c.skills))];
    const { requiredSkills } = await semanticSkillMatch(taskText, allSkills);
    const reqSet = new Set(requiredSkills);

    // 4. Score each candidate (same formula as Python)
    const results: RankedCandidate[] = candidates.map(p => {
        const ps = new Set(p.skills);
        const matched = [...ps].filter(s => reqSet.has(s));
        const skillMatch = reqSet.size > 0 ? (matched.length / reqSet.size) * 100 : 0;

        const wd = p.wellness_data || { active_tasks: 0, high_priority_count: 0, critical_urgency_count: 0 };
        const wScore = calculateWellness(wd.active_tasks, wd.high_priority_count, wd.critical_urgency_count);

        // Combined: skills (60%) + wellness (40%)
        let combined = skillMatch * 0.6 + wScore * 0.4;

        // Penalty if no matching skills at all
        if (reqSet.size > 0 && matched.length === 0) combined *= 0.10;

        // Role adjustments
        if (p.role === 'Manager') combined *= 0.90;
        else if (p.role === 'Admin') combined *= 0.80;
        else combined *= 1.10;

        combined = Math.min(100, combined);

        return {
            id: p.id,
            name: p.name,
            match_percentage: Math.round(skillMatch * 10) / 10,
            combined_ranking_score: Math.round(combined * 10) / 10,
            wellness_score: Math.round(wScore * 10) / 10,
            wellness_status: wellnessStatus(wScore),
            matching_skills: matched,
            missing_skills: [...reqSet].filter(s => !ps.has(s)),
        };
    });

    // Sort by combined score descending
    results.sort((a, b) => b.combined_ranking_score - a.combined_ranking_score);

    return {
        analysis: {
            predicted_priority: priority,
            confidence_score: `${Math.round(confidence * 100)}%`,
            urgency_score: urgencyScore,
            urgency_label: urgencyLabel,
            detected_skills: requiredSkills,
        },
        suggested_assignees: results.slice(0, 5),
    };
}
