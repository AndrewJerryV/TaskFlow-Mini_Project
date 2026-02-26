import json
import torch
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer, util
from setfit import SetFitModel

# ==========================================
# 1. CLASS DEFINITIONS (Combined from your files)
# ==========================================

class TaskPriorityModel:
    def __init__(self, model_path="./my_setfit_model"):
        print(f"Loading Priority Model from {model_path}...")
        try:
            self.model = SetFitModel.from_pretrained(model_path)
            self.id2label = {0: "High", 1: "Low", 2: "Medium"}
        except Exception as e:
            print(f"Error loading SetFit model: {e}")
            print("Make sure you have run the training script and the folder './my_setfit_model' exists.")
            raise e

    def predict(self, text):
        # SetFit models output a tensor of probabilities
        probs = self.model.predict_proba([text])[0]
        
        # Find the highest score
        confidence_score, pred_id = torch.max(probs, dim=0)
        confidence_score = confidence_score.item()
        
        # Apply Threshold Rule (Optional: return "Unsure" if low confidence)
        # For now, we return the best guess
        return self.id2label[pred_id.item()], confidence_score

class TaskAssigner:
    def __init__(self, people_json):
        print("Loading Skill Extraction Model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.people = people_json
        
        # Collect ALL unique skills from all people
        self.all_known_skills = list(set(
            skill for person in people_json for skill in person['skills']
        ))
        
        # Pre-compute embeddings for these skills
        self.skill_embeddings = self.model.encode(self.all_known_skills, convert_to_tensor=True)
        print(f"Skill System ready with {len(self.all_known_skills)} unique skills.")

    def find_best_match(self, task_text, threshold=0.30):
        # --- STEP 1: EXTRACT SKILLS ---
        task_embedding = self.model.encode(task_text, convert_to_tensor=True)
        cosine_scores = util.cos_sim(task_embedding, self.skill_embeddings)[0]

        matches = []
        for i, score in enumerate(cosine_scores):
            matches.append((self.all_known_skills[i], float(score)))

        # Sort by score descending
        matches.sort(key=lambda x: x[1], reverse=True)

        required_skills = [skill for skill, score in matches if score > threshold]

        # FAILSAFE: If no skills found, take the top 1 match
        if not required_skills and matches:
            required_skills = [matches[0][0]]

        # --- STEP 2: MATCH PEOPLE ---
        results = []
        required_set = set(required_skills)

        for person in self.people:
            person_skills = set(person['skills'])
            matching_skills = list(person_skills.intersection(required_set))
            
            # Calculate Score
            if len(required_set) > 0:
                match_score = (len(matching_skills) / len(required_set)) * 100
            else:
                match_score = 0.0
            
            results.append({
                "name": person['name'],
                "match_percentage": round(match_score, 1),
                "matching_skills": matching_skills,
                "missing_skills": list(required_set - person_skills)
            })

        # Sort by highest match percentage
        results = sorted(results, key=lambda x: x['match_percentage'], reverse=True)
        
        return results, required_skills

class UrgencyModel:
    def __init__(self):
        self.PRIORITY_SCORES = {
            "High": 40,
            "Medium": 20,
            "Low": 10
        }
        self.STATUS_MULTIPLIERS = {
            "To Do": 1.2,
            "In Progress": 1.0,
            "In Review": 0.5,
            "Done": 0.0
        }

    def predict(self, priority, status, days_until_due, days_since_update):
        # 1. Base Score
        score = self.PRIORITY_SCORES.get(priority, 10)
        
        # 2. Deadline Pressure
        if days_until_due <= 0:
            score += 50 + (abs(days_until_due) * 10)
        elif days_until_due <= 7:
            score += (7 - days_until_due) * 5
        
        # 3. Stagnation Penalty
        if days_since_update > 3:
            score += (days_since_update - 3) * 2

        # 4. Apply Status Multiplier
        multiplier = self.STATUS_MULTIPLIERS.get(status, 1.0)
        final_score = score * multiplier

        return round(final_score, 1)

    def get_urgency_label(self, score):
        if score == 0: return "Completed"
        if score >= 80: return "Critical"
        if score >= 50: return "High"
        if score >= 30: return "Moderate"
        return "Low"

# ==========================================
# 2. API SETUP
# ==========================================

app = FastAPI()

# Enable React Access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Adjust if your React app runs elsewhere
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOAD MODELS GLOBALLY ---
# This happens once when the server starts
print("\n--- INITIALIZING AI ENGINE ---")

# A. Priority Model (Requires the ./my_setfit_model folder from training)
priority_ai = TaskPriorityModel("./my_setfit_model")

# B. Skill/Assignment Model (Requires a 'database' of people)
people_db = [
    {
        "name": "Alice (Backend)",
        "skills": [
            # Core Tech
            "Python", "Django", "FastAPI", "SQL", "PostgreSQL", "Redis",
            # Cloud & DevOps
            "AWS", "Docker", "Serverless", "Terraform",
            # Tools & Methods
            "Git", "Jira", "Agile", "Unit Testing", "Microservices",
            # Soft Skills
            "Problem Solving", "Mentoring", "Code Review", "System Design"
        ]
    },
    {
        "name": "Bob (Frontend)",
        "skills": [
            # Core Tech
            "JavaScript", "TypeScript", "React", "Next.js", "CSS", "HTML", "Tailwind",
            # Design
            "Figma", "UI/UX", "Prototyping", "Accessibility (a11y)", "Responsive Design",
            # Soft Skills
            "Creativity", "Attention to Detail", "Communication", "Empathy", "User Research"
        ]
    },
    {
        "name": "Charlie (Fullstack)",
        "skills": [
            # Core Tech
            "Python", "JavaScript", "Node.js", "React", "SQL", "MongoDB", "GraphQL",
            # Architecture
            "REST APIs", "WebSockets", "System Architecture", "Security",
            # Soft Skills
            "Leadership", "Time Management", "Adaptability", "Cross-functional Collaboration",
            # Tools
            "Git", "CI/CD", "Webpack"
        ]
    },
    {
        "name": "Dave (Data)",
        "skills": [
            # Core Tech
            "Python", "R", "SQL", "NoSQL", "Spark",
            # Data Science
            "Pandas", "NumPy", "Machine Learning", "Data Analysis", "TensorFlow", "NLP",
            # Visualization
            "Tableau", "PowerBI", "Matplotlib", "Data Visualization",
            # Soft Skills
            "Critical Thinking", "Storytelling", "Statistical Analysis", "Business Intelligence"
        ]
    },
    {
        "name": "Eve (DevOps)",
        "skills": [
            # Core Tech
            "Linux", "Bash", "Python", "Go",
            # Infrastructure
            "AWS", "Azure", "Docker", "Kubernetes", "Terraform", "Ansible",
            # Operations
            "CI/CD", "Jenkins", "GitHub Actions", "Prometheus", "Grafana", "Log Management",
            # Soft Skills
            "Incident Management", "Teamwork", "Crisis Management", "Automation Mindset"
        ]
    },
    {
        "name": "Frank (Manager)",
        "skills": [
            # Management
            "Project Management", "Agile", "Scrum", "Kanban", "Risk Management",
            # Soft Skills
            "Leadership", "Conflict Resolution", "Public Speaking", "Negotiation", "Strategic Planning",
            # Tools
            "Jira", "Confluence", "Excel", "Slack", "Microsoft Teams"
        ]
    },
    {
        "name": "Grace (Content/Marketing)",
        "skills": [
            # Marketing
            "SEO", "Content Writing", "Copywriting", "Social Media Marketing", "Email Marketing",
            # Tools
            "Google Analytics", "WordPress", "Canva", "HubSpot",
            # Soft Skills
            "Creativity", "Communication", "Brand Strategy", "Customer Focus"
        ]
    }
]
assigner_ai = TaskAssigner(people_db)

# C. Urgency Model
urgency_ai = UrgencyModel()

print("✅ All systems ready!\n")

# ==========================================
# 3. ENDPOINTS
# ==========================================

class FullTaskRequest(BaseModel):
    description: str
    status: str            # "To Do", "In Progress", "In Review", "Done"
    days_until_due: int
    days_since_update: int

@app.post("/analyze_task")
def analyze_task(task: FullTaskRequest):
    # Step 1: Predict Priority (AI)
    predicted_priority, confidence = priority_ai.predict(task.description)
    
    # Step 2: Extract Skills & Find People (AI)
    ranked_people, required_skills = assigner_ai.find_best_match(task.description, threshold=0.30)
    
    # Step 3: Calculate Urgency (Logic)
    urgency_score = urgency_ai.predict(
        priority=predicted_priority,
        status=task.status,
        days_until_due=task.days_until_due,
        days_since_update=task.days_since_update
    )
    urgency_label = urgency_ai.get_urgency_label(urgency_score)

    # Return consolidated JSON
    return {
        "analysis": {
            "predicted_priority": predicted_priority,
            "confidence_score": f"{confidence:.1%}",
            "urgency_score": urgency_score,
            "urgency_label": urgency_label,
            "detected_skills": required_skills
        },
        "suggested_assignees": ranked_people[:3] # Return top 3 matches
    }

# To run: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)