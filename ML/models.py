import torch
from sentence_transformers import SentenceTransformer, util
from setfit import SetFitModel
from pydantic import BaseModel

class TaskPriorityModel:
    ID2LABEL = {0: "Low", 1: "Medium", 2: "High"}

    def __init__(self, path):
        self.model = SetFitModel.from_pretrained(path)

    def predict(self, text):
        probs = self.model.predict_proba([text])[0]
        confidence, pred_id = torch.max(probs, dim=0)
        return self.ID2LABEL[pred_id.item()], confidence.item()

class TaskAssigner:
    def __init__(self, people, sentence_model):
        self.model = sentence_model
        self.people = people
        self.all_skills = list({s for p in people for s in p["skills"]})
        self.skill_embeddings = self.model.encode(self.all_skills, convert_to_tensor=True)

    def find_best_match(self, task_text, max_skills=5, min_gap=0.10):
        scores = util.cos_sim(
            self.model.encode(task_text, convert_to_tensor=True),
            self.skill_embeddings,
        )[0]
        ranked = sorted(zip(self.all_skills, scores.tolist()), key=lambda x: x[1], reverse=True)

        # Find the biggest gap in the top candidates to separate signal from noise
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
        for p in self.people:
            ps = set(p["skills"])
            matched = list(ps & req_set)
            results.append({
                "name": p["name"],
                "match_percentage": round(len(matched) / len(req_set) * 100, 1) if req_set else 0.0,
                "matching_skills": matched,
                "missing_skills": list(req_set - ps),
            })
        return sorted(results, key=lambda x: x["match_percentage"], reverse=True), required

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
