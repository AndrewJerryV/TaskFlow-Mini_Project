import os

# Suppress TensorFlow logging to avoid clutter in the terminal
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from models import TaskPriorityModel, TaskAssigner, UrgencyModel, FullTaskRequest, WellnessRequest, BottleneckRequest
from wellness_model import WellnessModel
from datetime import datetime, timezone

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

# ── Bottleneck Analysis Endpoint ───────────────────────

@app.post("/analyze_bottlenecks")
def analyze_bottlenecks(req: BottleneckRequest):
    tasks = req.tasks

    bottlenecks = []
    urgency_threshold = 70  # Threshold for high urgency
    high_urgency_count = 0
    total_urgency = 0
    now = datetime.now(timezone.utc)

    for task in tasks:
        description = task.description or ""
        status = task.status or "To Do"
        due_date_str = task.dueDate
        updated_at_str = task.updatedAt

        # Calculate days_until_due
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                days_until_due = (due_date - now).days
            except Exception:
                days_until_due = 0
        else:
            days_until_due = 0

        # Calculate days_since_update
        if updated_at_str:
            try:
                updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                days_since_update = (now - updated_at).days
            except Exception:
                days_since_update = 0
        else:
            days_since_update = 0

        # Use real priority if available, else predict
        priority = task.priority
        if not priority:
            pred_priority, _ = priority_ai.predict(description)
        else:
            pred_priority = priority

        urgency = urgency_ai.predict(pred_priority, status, days_until_due, days_since_update)
        total_urgency += urgency
        if urgency >= urgency_threshold:
            high_urgency_count += 1
            bottlenecks.append({
                "type": "process",
                "location": task.projectId or "General",
                "projectId": task.projectId,
                "taskCount": 1,
                "avgDaysStuck": days_since_update,
                "recommendation": f"High-urgency task: {description}",
                "severity": "high" if urgency > 85 else "medium",
                "taskId": task.id
            })

    # Health score: penalize for each high-urgency bottleneck
    overallHealthScore = max(0, 100 - high_urgency_count * 10)
    if high_urgency_count == 0:
        healthSummary = "Workflow is healthy."
    elif overallHealthScore < 50:
        healthSummary = f"Critical: {high_urgency_count} high-urgency bottlenecks detected."
    else:
        healthSummary = f"{high_urgency_count} high-urgency bottlenecks detected."

    return {
        "bottlenecks": bottlenecks,
        "summary": {
            "processBottlenecks": len([b for b in bottlenecks if b["type"] == "process"]),
            "personBottlenecks": len([b for b in bottlenecks if b["type"] == "person"]),
            "total": len(bottlenecks)
        },
        "overallHealthScore": overallHealthScore,
        "healthSummary": healthSummary,
        "mlPowered": True
    }

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