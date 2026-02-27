// test_server.js

const API_URL = "http://127.0.0.1:8000/analyze_task";

// Define a few test scenarios to check your model's logic
const testCases = [
    {
        scenario: "CRITICAL: Database Down",
        payload: {
            description: "Production database is down and users are getting 500 errors",
            status: "To Do",
            days_until_due: 0,      // Due today
            days_since_update: 0    // Just happened
        }
    },
    {
        scenario: "LOW: Office Party",
        payload: {
            description: "Plan the office holiday party and buy snacks",
            status: "To Do",
            days_until_due: 14,     // Due in 2 weeks
            days_since_update: 0
        }
    },
    {
        scenario: "STAGNANT: Forgotten Task",
        payload: {
            description: "Update the API documentation for the new endpoint",
            status: "In Progress",
            days_until_due: 5,
            days_since_update: 20   // Hasn't been touched in 20 days!
        }
    },
    {
        scenario: "Create a Figma design for a sign up page ",
        payload: {
            description: "Design figma design",
            status: "In Progress",
            days_until_due: 5,
            days_since_update: 20   // Hasn't been touched in 20 days!
        }
    }
];

async function runTests() {
    console.log(`🚀 Testing Server at ${API_URL}...\n`);

    for (const test of testCases) {
        console.log(`--- Testing Scenario: ${test.scenario} ---`);
        
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(test.payload)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Print a formatted summary
            console.log(`📋 Predicted Priority: ${data.analysis.predicted_priority} (Confidence: ${data.analysis.confidence_score})`);
            console.log(`🚨 Urgency:            ${data.analysis.urgency_label} (Score: ${data.analysis.urgency_score})`);
            console.log(`🛠️  Detected Skills:    ${data.analysis.detected_skills.join(", ") || "None"}`);
            
            console.log(`👤 Top Assignee:       ${data.suggested_assignees[0]?.name || "None"} (${data.suggested_assignees[0]?.match_percentage}% match)`);
            console.log("\n");

        } catch (error) {
            console.error(`❌ Error: ${error.message}\n`);
            console.log("Make sure your Python server is running! (uvicorn main:app --reload)");
            break; 
        }
    }
}

runTests();