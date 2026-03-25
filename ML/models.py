import torch
import logging
from sentence_transformers import SentenceTransformer, util
from setfit import SetFitModel
from pydantic import BaseModel

logger = logging.getLogger(__name__)

def get_device():
    if torch.cuda.is_available():
        try:
            torch.zeros(1).cuda()
            return "cuda"
        except Exception as e:
            logger.warning(f"CUDA available but failed test: {e}. Falling back to CPU.")
    return "cpu"

class TaskPriorityModel:
    ID2LABEL = {0: "Low", 1: "Medium", 2: "High", 3: "Critical"}

    def __init__(self, path):
        device = get_device()
        logger.info(f"Loading TaskPriorityModel on device: {device}")
        self.model = SetFitModel.from_pretrained(path)
        if device == "cpu":
            self.model = self.model.to(device)

    def predict(self, text):
        """Predicts the priority of a given task description."""
        probs = self.model.predict_proba([text])[0]
        confidence, pred_id = torch.max(probs, dim=0)
        return self.ID2LABEL[pred_id.item()], confidence.item()

class TaskAssigner:
    def __init__(self, sentence_model):
        self.model = sentence_model

    def find_best_match(self, task_text, candidates, wellness_model=None, max_skills=5, min_gap=0.10):
        all_skills = list({s for p in candidates for s in p.get("skills", [])})
        if not all_skills:
            return [], []

        skill_embeddings = self.model.encode(all_skills, convert_to_tensor=True)

        semantic_scores = util.cos_sim(
            self.model.encode(task_text, convert_to_tensor=True),
            skill_embeddings,
        )[0]
        
        task_lower = task_text.lower()
        
        aliases = {
            "website": ["html5", "react", "next.js", "frontend", "javascript", "vue", "angular"],
            "ui": ["react", "frontend", "figma", "tailwind css", "framer motion", "css"],
            "color": ["tailwind css", "css", "frontend", "framer motion"],
            "style": ["tailwind css", "css", "frontend"],
            "button": ["react", "frontend", "tailwind css", "html5"],
            "database": ["mongodb", "postgresql", "sql", "prisma", "mongoose", "supabase"],
            "auth": ["firebase", "supabase", "next-auth", "jwt"],
            "login": ["firebase", "supabase", "next-auth", "jwt", "react"]
        }
        
        keyword_scores = []
        for skill in all_skills:
            skill_lower = skill.lower()
            score = 0.0
            
            if skill_lower in task_lower:
                score = 1.0
            elif " " in skill_lower:
                parts = skill_lower.split()
                if any(p in task_lower and len(p) > 2 for p in parts):
                    score = 0.5
            
            for word, skill_list in aliases.items():
                if word in task_lower and skill_lower in [s.lower() for s in skill_list]:
                    score = max(score, 0.8)
            
            keyword_scores.append(score)
        
        # Combined score: Semantic (70%) + Keyword (30%)
        final_similarity_scores = []
        for s_score, k_score in zip(semantic_scores.tolist(), keyword_scores):
            # Boost the semantic score significantly if keywords match
            boosted = s_score + (k_score * 0.6)
            final_similarity_scores.append(boosted)

        ranked = sorted(zip(all_skills, final_similarity_scores), key=lambda x: x[1], reverse=True)

        top = ranked[:max_skills * 2]
        best_cut, max_drop = len(top), 0
        for i in range(1, len(top)):
            drop = top[i - 1][1] - top[i][1]
            if drop > max_drop and drop >= min_gap:
                max_drop = drop
                best_cut = i
        required = [s for s, _ in top[:best_cut]][:max_skills]
        if not required:
            required = [s for s, _ in ranked[:3]]
        req_set = set(required)

        results = []
        for p in candidates:
            ps = set(p.get("skills", []))
            matched = list(ps & req_set)
            
            # Skill Match Score (0-100)
            skill_match = (len(matched) / len(req_set) * 100) if req_set else 0.0
            
            wellness_score = 100
            if wellness_model and "wellness_data" in p:
                wd = p["wellness_data"]
                wellness_score = wellness_model.calculate(
                    wd.get("active_tasks", 0),
                    wd.get("high_priority_count", 0),
                    wd.get("critical_urgency_count", 0)
                )

            # Combined Score: prioritize skills (60%) wellness factor (40%)
            combined_score = (skill_match * 0.6) + (wellness_score * 0.4)

            # Heavy penalty if they have absolutely NO matching skills when skills are required
            if req_set and len(matched) == 0:
                combined_score *= 0.10

            role = p.get("role", "Member")
            if role == "Manager":
                combined_score *= 0.90
            elif role == "Admin":
                combined_score *= 0.80
            else:
                combined_score *= 1.10
            
            combined_score = min(100.0, combined_score)

            results.append({
                "name": p["name"],
                "id": p.get("id"),
                "match_percentage": round(skill_match, 1),
                "wellness_score": round(wellness_score, 1),
                "combined_ranking_score": round(combined_score, 1),
                "matching_skills": matched,
                "missing_skills": list(req_set - ps),
                "wellness_status": wellness_model.get_status(wellness_score) if wellness_model else "N/A"
            })
        
        # Rank by combined score
        return sorted(results, key=lambda x: x["combined_ranking_score"], reverse=True), required

class UrgencyModel:
    PRIORITY_SCORES = {"High": 40, "Medium": 20, "Low": 10}
    STATUS_MULTIPLIERS = {"To Do": 1.2, "In Progress": 1.0, "In Review": 0.5, "Done": 0.0}

    def predict(self, priority, status, days_until_due, days_since_update):
        score = self.PRIORITY_SCORES.get(priority, 10)
        
        if days_until_due <= 0:
            score += 50 + abs(days_until_due) * 10
        elif days_until_due <= 7:
            score += (7 - days_until_due) * 5
            
        if days_since_update > 3:
            score += (days_since_update - 3) * 2
            
        return round(score * self.STATUS_MULTIPLIERS.get(status, 1.0), 1)

    @staticmethod
    def label(score):
        if score == 0:   return "Completed"
        if score >= 80:   return "Critical"
        if score >= 50:   return "High"
        if score >= 30:   return "Moderate"
        return "Low"

class FullTaskRequest(BaseModel):
    description: str
    status: str
    days_until_due: int
    days_since_update: int
    candidates: list[dict] = []

class WellnessRequest(BaseModel):
    active_tasks: int
    high_priority_count: int
    critical_urgency_count: int


class BottleneckTask(BaseModel):
    id: str
    projectId: str | None = None
    description: str | None = None
    status: str
    priority: str | None = None
    dueDate: str | None = None
    updatedAt: str | None = None


class BottleneckRequest(BaseModel):
    tasks: list[BottleneckTask]


class BatchPriorityTask(BaseModel):
    id: str
    description: str

class BatchPriorityRequest(BaseModel):
    tasks: list[BatchPriorityTask]


class RebalancingMember(BaseModel):
    id: str
    name: str
    skills: list[str] = []
    wellness_score: float = 100.0
    active_task_count: int = 0
    role: str = "Member"

class RebalancingTask(BaseModel):
    id: str
    title: str
    description: str = ""
    priority: str = "Medium"

class RebalancingRequest(BaseModel):
    overloaded_members: list[dict]
    available_members: list[RebalancingMember]

class ClusterTask(BaseModel):
    id: str
    title: str
    description: str = ""

class ClusterRequest(BaseModel):
    tasks: list[ClusterTask]
