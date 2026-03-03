import json
import os

# Suppress TensorFlow logging to avoid clutter in the terminal
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from models import TaskPriorityModel, TaskAssigner, UrgencyModel, FullTaskRequest, WellnessRequest
from wellness_model import WellnessModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "my_setfit_model")
SKILL_MODEL_PATH = os.path.join(BASE_DIR, "skill_matcher_model")

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
assigner_ai = TaskAssigner(sentence_model)
urgency_ai = UrgencyModel()
wellness_ai = WellnessModel()
print("[SUCCESS] All systems ready!\n")

@app.get("/")
def health_check():
    return {"status": "ok"}


# ── Endpoint ────────────────────────────────────────────

@app.post("/analyze_task")
def analyze_task(task: FullTaskRequest):
    print(f"Analyzing task: {task.description[:50]}...")
    priority, confidence = priority_ai.predict(task.description)
    
    # Use candidates from request
    ranked_people, skills = assigner_ai.find_best_match(task.description, task.candidates)
    
    urgency_score = urgency_ai.predict(priority, task.status, task.days_until_due, task.days_since_update)

    return {
        "analysis": {
            "predicted_priority": priority,
            "confidence_score": f"{confidence:.1%}",
            "urgency_score": urgency_score,
            "urgency_label": urgency_ai.label(urgency_score),
            "detected_skills": skills,
        },
        "suggested_assignees": ranked_people[:5], # Return up to 5 suggested assignees
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