import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from models import TaskPriorityModel, TaskAssigner, UrgencyModel, FullTaskRequest, WellnessRequest
from wellness_model import WellnessModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "my_setfit_model")
SKILL_MODEL_PATH = os.path.join(BASE_DIR, "skill_matcher_model")
PEOPLE_DB_PATH = os.path.join(BASE_DIR, "people.json")

# ── App & Init ──────────────────────────────────────────

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("\n--- INITIALIZING AI ENGINE ---")
priority_ai = TaskPriorityModel(MODEL_PATH)
sentence_model = SentenceTransformer(SKILL_MODEL_PATH)
with open(PEOPLE_DB_PATH) as f:
    people_db = json.load(f)
assigner_ai = TaskAssigner(people_db, sentence_model)
urgency_ai = UrgencyModel()
wellness_ai = WellnessModel()
print("✅ All systems ready!\n")

# ── Endpoint ────────────────────────────────────────────

@app.post("/analyze_task")
def analyze_task(task: FullTaskRequest):
    priority, confidence = priority_ai.predict(task.description)
    ranked_people, skills = assigner_ai.find_best_match(task.description)
    urgency_score = urgency_ai.predict(priority, task.status, task.days_until_due, task.days_since_update)

    return {
        "analysis": {
            "predicted_priority": priority,
            "confidence_score": f"{confidence:.1%}",
            "urgency_score": urgency_score,
            "urgency_label": urgency_ai.label(urgency_score),
            "detected_skills": skills,
        },
        "suggested_assignees": ranked_people[:3],
    }

@app.post("/analyze_wellness")
def analyze_wellness(req: WellnessRequest):
    score = wellness_ai.calculate(req.active_tasks, req.high_priority_count, req.critical_urgency_count)
    status = wellness_ai.get_status(score)
    return {
        "score": score,
        "status": status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)