
import { predictPriority, predictUrgency, calculateSkillMatch, isMLAvailable } from '../lib/ml-engine';

// Mock task for Urgency
const mockTask = {
    priority: 'High',
    status: 'To Do',
    daysUntilDue: -1, // Overdue
    hasDueDate: true,
    daysSinceUpdate: 10, // Stale
    createdDaysAgo: 20
};

// Mock descriptions for Priority
const descriptions = [
    "Fix critical security vulnerability in authentication",
    "Update footer copyright year",
    "Server crashing every 5 minutes due to memory leak",
    "Add tooltip to user profile icon"
];

console.log("---------------------------------------------------");
console.log("       🔍 LOCAL ML VERIFICATION PROOF              ");
console.log("---------------------------------------------------");

if (!isMLAvailable()) {
    console.error("❌ Models NOT loaded. Check ml/models/ directory.");
    process.exit(1);
}

console.log("✅ Models loaded successfully from JSON.");

console.log("\n1. TESTING PRIORITY CLASSIFIER (Random Forest)");
console.log("---------------------------------------------------");
descriptions.forEach(desc => {
    const priority = predictPriority("Task", desc);
    console.log(`Input: "${desc.padEnd(50)}" \n -> Prediction: ${priority}`);
});


console.log("\n2. TESTING URGENCY SCORER (Gradient Boosting)");
console.log("---------------------------------------------------");
console.log("Task Stats:", JSON.stringify(mockTask, null, 2));
const urgency = predictUrgency(mockTask);
console.log(` -> Urgency Score: ${urgency.toFixed(2)} / 100`);


console.log("\n3. TESTING SKILL MATCHER (TF-IDF Cosine Similarity)");
console.log("---------------------------------------------------");
const taskText = "Build a React component with TypeScript and Tailwind CSS";
const userSkills = ["React", "TypeScript", "CSS", "Frontend"];
const match = calculateSkillMatch(taskText, userSkills);
console.log(`Task: "${taskText}"`);
console.log(`User Skills: [${userSkills.join(", ")}]`);
console.log(` -> Match Score: ${(match * 100).toFixed(2)}%`);

console.log("---------------------------------------------------");
