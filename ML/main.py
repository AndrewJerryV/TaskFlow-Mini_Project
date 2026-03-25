import os

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from models import TaskPriorityModel, TaskAssigner, UrgencyModel, FullTaskRequest, WellnessRequest, BottleneckRequest, BatchPriorityRequest, RebalancingRequest, ClusterRequest, get_device
from wellness_model import WellnessModel
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "my_setfit_model_critical")
SKILL_MODEL_PATH = os.path.join(BASE_DIR, "skill_matcher_model")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = get_device()
print(f"\n--- INITIALIZING AI ENGINE (device: {device}) ---")
priority_ai = TaskPriorityModel(MODEL_PATH)
sentence_model = SentenceTransformer(SKILL_MODEL_PATH, device=device)
assigner_ai = TaskAssigner(sentence_model)
urgency_ai = UrgencyModel()
wellness_ai = WellnessModel()
print("[SUCCESS] All systems ready!\n")

# ── Bottleneck Analysis ───────────────────────

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
        """Calculates days elapsed since the task's last update."""
        if updated_at_str:
            try:
                updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                return max(0, (now - updated_at).days)
            except Exception:
                return 0
        return 0

    def parse_days_overdue(due_date_str):
        """Calculates how many days a task is past its due date."""
        if due_date_str:
            try:
                due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                delta = now - due_date
                if delta.total_seconds() > 0:
                    return max(0, delta.days)
                return -1 # Not overdue yet
            except Exception:
                return -1
        return -1

    for task in tasks:
        project_id = task.projectId or "General"
        tasks_by_project.setdefault(project_id, []).append(task)

    for project_id, project_tasks in tasks_by_project.items():
        overdue_tasks = [
            t for t in project_tasks
            if t.dueDate and (t.status or "To Do") != "Done" and parse_days_overdue(t.dueDate) >= 0
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
                "recommendation": f"Overdue work detected ({len(overdue_tasks)} tasks).",
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
                "location": "Aging WIP",
                "projectId": project_id,
                "taskCount": len(aging_tasks),
                "avgDaysStuck": avg_days,
                "recommendation": f"Aging WIP detected ({len(aging_tasks)} tasks >= {aging_days} days). Swarm to unblock and finish work in progress.",
                "severity": severity
            })

    # Health score: compute penalty dynamically
    health_penalty = 0
    for b in bottlenecks:
        penalty = 10 # Base penalty
        if b["severity"] == "high":
            penalty += 15
        elif b["severity"] == "medium":
            penalty += 5
        
        # Penalize further based on volume of affected tasks
        penalty += int(b["taskCount"]) * 2
        health_penalty += penalty

    overallHealthScore = max(0, min(100, 100 - health_penalty))

    if len(bottlenecks) == 0:
        healthSummary = "Workflow is healthy."
    elif overallHealthScore < 50:
        healthSummary = f"Critical: {len(bottlenecks)} bottlenecks detected impacting {sum(b['taskCount'] for b in bottlenecks)} tasks."
    else:
        healthSummary = f"{len(bottlenecks)} bottlenecks detected impacting {sum(b['taskCount'] for b in bottlenecks)} tasks."

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

@app.post("/analyze_task")
def analyze_task(task: FullTaskRequest):

    print(f"Analyzing task: {task.description[:50]}...")
    priority, confidence = priority_ai.predict(task.description)
    
    # Use candidates from request
    ranked_people, skills = assigner_ai.find_best_match(task.description, task.candidates, wellness_model=wellness_ai)
    
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

# ── Batch Priority Check ──────────────────

@app.post("/batch_priority_check")
def batch_priority_check(req: BatchPriorityRequest):
    print(f"--- Batch Priority Check ({len(req.tasks)} tasks) ---")
    results = []
    for task in req.tasks:
        priority, confidence = priority_ai.predict(task.description)
        results.append({
            "id": task.id,
            "predicted_priority": priority,
            "confidence": round(confidence, 3)
        })
    return {"predictions": results}

# ── Workload Rebalancing ──────────────────

@app.post("/suggest_rebalancing")
def suggest_rebalancing(req: RebalancingRequest):
    suggestions = []

    for entry in req.overloaded_members:
        member_data = entry.get("member", {})
        member_tasks = entry.get("tasks", [])
        member_name = member_data.get("name", "Unknown")
        member_id = member_data.get("id", "")
        member_wellness = member_data.get("wellness_score", 0)

        for task_data in member_tasks:
            task_id = task_data.get("id", "")
            task_title = task_data.get("title", "")
            task_desc = task_data.get("description", "")
            task_text = f"{task_title} {task_desc}".strip()

            if not task_text:
                continue

            # Use skill matching to find the best available member
            candidates = [
                {
                    "name": m.name,
                    "id": m.id,
                    "skills": m.skills,
                    "role": m.role,
                    "wellness_data": {
                        "active_tasks": m.active_task_count,
                        "high_priority_count": 0,
                        "critical_urgency_count": 0
                    }
                }
                for m in req.available_members
            ]

            if not candidates:
                continue

            ranked, required_skills = assigner_ai.find_best_match(
                task_text, candidates, wellness_model=wellness_ai
            )

            if ranked and ranked[0]["combined_ranking_score"] > 10:
                best = ranked[0]
                suggestions.append({
                    "taskId": task_id,
                    "taskTitle": task_title,
                    "taskPriority": task_data.get("priority", "Medium"),
                    "fromUser": {"id": member_id, "name": member_name, "wellness": round(member_wellness)},
                    "toUser": {
                        "id": best["id"],
                        "name": best["name"],
                        "skillMatch": round(best["match_percentage"]),
                        "wellness": round(best["wellness_score"]),
                        "wellnessStatus": best["wellness_status"],
                        "matchingSkills": best["matching_skills"]
                    },
                    "requiredSkills": required_skills
                })

    suggestions.sort(key=lambda s: s["toUser"]["skillMatch"], reverse=True)
    return {"suggestions": suggestions[:5]}

# ── Task Clustering ───────────────────────

@app.post("/cluster_tasks")
def cluster_tasks(req: ClusterRequest):
    if len(req.tasks) < 2:
        return {"clusters": []}

    texts = [f"{t.title} {t.description}".strip() for t in req.tasks]
    ids = [t.id for t in req.tasks]
    titles = [t.title for t in req.tasks]

    from sentence_transformers import util as st_util
    embeddings = sentence_model.encode(texts, convert_to_tensor=True)

    sim_matrix = st_util.cos_sim(embeddings, embeddings)

    SIMILARITY_THRESHOLD = 0.40
    visited = set()
    clusters = []

    for i in range(len(req.tasks)):
        if i in visited:
            continue
        cluster_indices = [i]
        for j in range(i + 1, len(req.tasks)):
            if j in visited:
                continue
            if sim_matrix[i][j].item() >= SIMILARITY_THRESHOLD:
                cluster_indices.append(j)

        if len(cluster_indices) >= 2:
            for idx in cluster_indices:
                visited.add(idx)

            cluster_tasks_list = [
                {"id": ids[idx], "title": titles[idx], "similarity": round(sim_matrix[i][idx].item(), 2)}
                for idx in cluster_indices
            ]

            clusters.append({
                "taskIds": [ids[idx] for idx in cluster_indices],
                "tasks": cluster_tasks_list,
                "size": len(cluster_indices)
            })

    clusters.sort(key=lambda c: c["size"], reverse=True)
    return {"clusters": clusters[:5]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)