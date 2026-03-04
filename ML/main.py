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
    now = datetime.now(timezone.utc)

    # Industry-standard signals: WIP limits and aging WIP
    wip_limit = 8
    aging_days = 5
    wip_statuses = {"In Progress", "Review"}

    tasks_by_project = {}

    def parse_days_since_update(updated_at_str):
        if updated_at_str:
            try:
                updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                return max(0, (now - updated_at).days)
            except Exception:
                return 0
        return 0

    def parse_days_overdue(due_date_str):
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                return max(0, (now - due_date).days)
            except Exception:
                return 0
        return 0

    for task in tasks:
        project_id = task.projectId or "General"
        tasks_by_project.setdefault(project_id, []).append(task)

    for project_id, project_tasks in tasks_by_project.items():
        overdue_tasks = [
            t for t in project_tasks
            if t.dueDate and (t.status or "To Do") != "Done" and parse_days_overdue(t.dueDate) > 0
        ]

        if len(overdue_tasks) > 0:
            avg_days = round(sum(parse_days_overdue(t.dueDate) for t in overdue_tasks) / max(1, len(overdue_tasks)))
            avg_days = max(1, avg_days)
            severity = "high" if len(overdue_tasks) >= 5 else "medium"
            bottlenecks.append({
                "type": "process",
                "location": "Overdue Work",
                "projectId": project_id,
                "taskCount": len(overdue_tasks),
                "avgDaysStuck": avg_days,
                "recommendation": f"Overdue work detected ({len(overdue_tasks)} tasks). Review scope, unblock dependencies, and re-plan delivery.",
                "severity": severity
            })
        # WIP limit breaches per status
        for status in wip_statuses:
            status_tasks = [t for t in project_tasks if (t.status or "To Do") == status and t.status != "Done"]
            if len(status_tasks) >= wip_limit:
                avg_days = round(sum(parse_days_since_update(t.updatedAt) for t in status_tasks) / max(1, len(status_tasks)))
                avg_days = max(1, avg_days)
                overage = len(status_tasks) - wip_limit
                severity = "high" if overage >= 4 else "medium"
                bottlenecks.append({
                    "type": "process",
                    "location": status,
                    "projectId": project_id,
                    "taskCount": len(status_tasks),
                    "avgDaysStuck": avg_days,
                    "recommendation": f"WIP limit exceeded in {status} ({len(status_tasks)}/{wip_limit}). Reduce in-progress work or add capacity.",
                    "severity": severity
                })

        # Aging WIP: tasks not updated for a threshold
        aging_tasks = [t for t in project_tasks if (t.status or "To Do") != "Done" and parse_days_since_update(t.updatedAt) >= aging_days]
        if len(aging_tasks) >= 3:
            avg_days = round(sum(parse_days_since_update(t.updatedAt) for t in aging_tasks) / max(1, len(aging_tasks)))
            avg_days = max(1, avg_days)
            severity = "high" if len(aging_tasks) >= 5 else "medium"
            bottlenecks.append({
                "type": "process",
                "location": project_id,
                "projectId": project_id,
                "taskCount": len(aging_tasks),
                "avgDaysStuck": avg_days,
                "recommendation": f"Aging WIP detected ({len(aging_tasks)} tasks >= {aging_days} days). Swarm to unblock and finish work in progress.",
                "severity": severity
            })

    # Health score: penalize per bottleneck
    overallHealthScore = max(0, 100 - (len(bottlenecks) * 12))
    if len(bottlenecks) == 0:
        healthSummary = "Workflow is healthy."
    elif overallHealthScore < 50:
        healthSummary = f"Critical: {len(bottlenecks)} bottlenecks detected."
    else:
        healthSummary = f"{len(bottlenecks)} bottlenecks detected."

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