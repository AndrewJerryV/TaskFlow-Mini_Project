'use server';

import { predictPriority, predictUrgency, calculateSkillMatch, isMLAvailable, TaskFeatures } from '@/lib/ml-engine';

export async function checkMLStatus() {
    return { available: isMLAvailable() };
}

export async function testPriority(title: string, description: string) {
    const start = performance.now();
    const prediction = predictPriority(title, description);
    const end = performance.now();

    return {
        prediction,
        timeMs: Math.round(end - start),
        usedModel: 'RandomForestClassifier'
    };
}

export async function testUrgency(features: TaskFeatures) {
    const start = performance.now();
    const score = predictUrgency(features);
    const end = performance.now();

    return {
        score: Math.round(score),
        timeMs: Math.round(end - start),
        usedModel: 'GradientBoostingRegressor'
    };
}

export async function testSkillMatch(taskText: string, skills: string[]) {
    const start = performance.now();
    const score = calculateSkillMatch(taskText, skills);
    const end = performance.now();

    return {
        score: (score * 100).toFixed(1),
        timeMs: Math.round(end - start),
        usedModel: 'TF-IDF Cosine Similarity'
    };
}
