import fs from 'fs';
import path from 'path';

// ============================================================
// Model Types
// ============================================================

interface TreeNode {
    type: 'split' | 'leaf';
    feature?: number;
    featureName?: string;
    threshold?: number;
    left?: TreeNode;
    right?: TreeNode;
    value?: number | number[];
}

interface RandomForestModel {
    type: 'RandomForestClassifier';
    nClasses: number;
    classes: string[];
    nEstimators: number;
    trees: TreeNode[];
    accuracy: number;
}

interface GradientBoostingModel {
    type: 'GradientBoostingRegressor';
    nEstimators: number;
    learningRate: number;
    initValue: number;
    trees: TreeNode[];
    featureInfo: {
        features: string[];
        priorityMap: Record<string, number>;
        statusMap: Record<string, number>;
    };
}

interface TfidfModel {
    vocabulary: Record<string, number>;
    idf: number[];
    maxFeatures: number;
}

interface LabelEncoderModel {
    classes: string[];
    mapping: Record<string, number>;
}

// ============================================================
// Inference EngineState
// ============================================================

const MODELS_DIR = path.join(process.cwd(), 'ml', 'models');

// Lazy-loaded models
let priorityClassifier: RandomForestModel | null = null;
let urgencyScorer: GradientBoostingModel | null = null;
let tfidfVectorizer: TfidfModel | null = null;
let labelEncoder: LabelEncoderModel | null = null;
let skillMatcherTfidf: TfidfModel | null = null;

function loadModel<T>(filename: string): T | null {
    try {
        const filePath = path.join(MODELS_DIR, filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as T;
        }
    } catch (error) {
        console.warn(`Failed to load model: ${filename}`, error);
    }
    return null;
}

function ensureModelsLoaded() {
    if (!priorityClassifier) priorityClassifier = loadModel<RandomForestModel>('priority_classifier.json');
    if (!urgencyScorer) urgencyScorer = loadModel<GradientBoostingModel>('urgency_scorer.json');
    if (!tfidfVectorizer) tfidfVectorizer = loadModel<TfidfModel>('tfidf_vectorizer.json');
    if (!labelEncoder) labelEncoder = loadModel<LabelEncoderModel>('label_encoder.json');
    if (!skillMatcherTfidf) skillMatcherTfidf = loadModel<TfidfModel>('skill_matcher_tfidf.json');
}

export function isMLAvailable(): boolean {
    ensureModelsLoaded();
    return !!(priorityClassifier && urgencyScorer && tfidfVectorizer && labelEncoder && skillMatcherTfidf);
}

// ============================================================
// Logic: TF-IDF Transformation
// ============================================================

function transformText(text: string, model: TfidfModel | null): number[] {
    if (!model) return [];

    // Simple tokenization matching sklearn's default pattern roughly
    const tokens = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 1);

    // Count term frequencies
    const tf: Record<number, number> = {};
    for (const token of tokens) {
        if (token in model.vocabulary) {
            const idx = model.vocabulary[token];
            tf[idx] = (tf[idx] || 0) + 1;
        }
    }

    const vector = new Array(model.maxFeatures).fill(0);
    let norm = 0;

    for (const [idxStr, count] of Object.entries(tf)) {
        const idx = parseInt(idxStr);
        const val = count * model.idf[idx];
        vector[idx] = val;
        norm += val * val;
    }

    // L2 normalization
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < vector.length; i++) {
            // Safe check for index bounds
            if (i < vector.length) {
                vector[i] /= norm;
            }
        }
    }

    return vector;
}

// ============================================================
// Logic: Tree Traversal
// ============================================================

function predictTree(node: TreeNode, features: number[] | Record<number, number>): number | number[] {
    if (node.type === 'leaf') {
        return node.value!;
    }

    // Use 0 as default if feature is missing (sparse/missing value)
    let val = 0;
    if (Array.isArray(features)) {
        val = features[node.feature!] ?? 0;
    } else {
        val = features[node.feature!] ?? 0;
    }

    if (val <= node.threshold!) {
        return predictTree(node.left!, features);
    } else {
        return predictTree(node.right!, features);
    }
}

// ============================================================
// Public API: Priority Prediction
// ============================================================

export function predictPriority(title: string, description: string): string | null {
    ensureModelsLoaded();
    if (!priorityClassifier || !tfidfVectorizer || !labelEncoder) return null;

    const text = `${title} ${description}`;
    const features = transformText(text, tfidfVectorizer);

    if (features.length === 0) return 'Medium'; // Default fallback

    // Aggregate predictions from all trees (Soft Voting)
    // Scikit-learn averages the class probabilities from all trees
    const summedProbs = new Array(priorityClassifier.nClasses).fill(0);

    for (const tree of priorityClassifier.trees) {
        const counts = predictTree(tree, features) as number[];
        let total = 0;
        for (const c of counts) total += c;

        if (total > 0) {
            for (let i = 0; i < counts.length; i++) {
                summedProbs[i] += counts[i] / total;
            }
        }
    }

    // Find winner (argmax of summed probabilities)
    let maxProb = -1;
    let winnerIdx = -1;
    for (let i = 0; i < summedProbs.length; i++) {
        if (summedProbs[i] > maxProb) {
            maxProb = summedProbs[i];
            winnerIdx = i;
        }
    }

    return labelEncoder.classes[winnerIdx] || 'Medium';
}

// ============================================================
// Public API: Urgency Scoring
// ============================================================

export interface TaskFeatures {
    priority: string;
    status: string;
    daysUntilDue: number;
    hasDueDate: boolean;
    daysSinceUpdate: number;
    createdDaysAgo: number;
}

export function predictUrgency(task: TaskFeatures): number {
    ensureModelsLoaded();
    if (task.status === 'Done') return 0;
    if (!urgencyScorer) return 50; // default

    const { priorityMap, statusMap } = urgencyScorer.featureInfo;

    const priorityEnc = priorityMap[task.priority] ?? 1;
    const statusEnc = statusMap[task.status] ?? 0;

    const isOverdue = (task.daysUntilDue < 0 && task.hasDueDate) ? 1 : 0;
    const isDueSoon = (task.daysUntilDue >= 0 && task.daysUntilDue <= 3 && task.hasDueDate) ? 1 : 0;
    const isStale = (task.daysSinceUpdate > 5) ? 1 : 0;
    const isInProgress = (task.status === 'In Progress') ? 1 : 0;

    const features = [
        priorityEnc,
        statusEnc,
        task.daysUntilDue,
        task.hasDueDate ? 1 : 0,
        task.daysSinceUpdate,
        task.createdDaysAgo,
        isOverdue,
        isDueSoon,
        isStale,
        isInProgress
    ];

    let score = urgencyScorer.initValue;
    for (const tree of urgencyScorer.trees) {
        const prediction = predictTree(tree, features) as number;
        score += urgencyScorer.learningRate * prediction;
    }

    return Math.max(0, Math.min(100, score));
}

// ============================================================
// Public API: Skill Matching
// ============================================================

export function calculateSkillMatch(taskText: string, userSkills: string[]): number {
    ensureModelsLoaded();
    if (!skillMatcherTfidf) return 0;

    const taskVec = transformText(taskText, skillMatcherTfidf);
    const skillText = userSkills.join(' ');
    const skillVec = transformText(skillText, skillMatcherTfidf);

    // Cosine similarity
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < taskVec.length; i++) {
        const a = taskVec[i];
        // skillVec is also size maxFeatures, same indices
        const b = skillVec[i];
        dot += a * b;
        normA += a * a;
        normB += b * b;
    }

    // transformText already normalizes vectors to unit length (L2 norm = 1) if not zero
    // So dot product IS cosine similarity
    // Double check norm logic in transformText:
    // norm = sum(x^2), then divide by sqrt(norm). 
    // So result vector has L2 norm = 1.

    return dot;
}
