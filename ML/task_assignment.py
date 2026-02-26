import json
import numpy as np
from sentence_transformers import SentenceTransformer, util

class TaskAssigner:
    def __init__(self, people_json):
        print("Loading Model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.people = people_json
        
        # 1. Collect ALL unique skills from all people
        self.all_known_skills = list(set(
            skill for person in people_json for skill in person['skills']
        ))
        
        # 2. Pre-compute embeddings for these skills
        self.skill_embeddings = self.model.encode(self.all_known_skills, convert_to_tensor=True)
        print(f"System ready with {len(self.all_known_skills)} unique skills.\n")

    def find_best_match(self, task_text, threshold=0.30, debug=False):
        """
        Analyzes task and returns (json_results, required_skills_list).
        """
        if debug:
            print(f"[DEBUG] Analyzing Task: '{task_text}'")

        # --- STEP 1: EXTRACT SKILLS ---
        task_embedding = self.model.encode(task_text, convert_to_tensor=True)
        cosine_scores = util.cos_sim(task_embedding, self.skill_embeddings)[0]

        matches = []
        for i, score in enumerate(cosine_scores):
            matches.append((self.all_known_skills[i], float(score)))

        # Sort by score descending
        matches.sort(key=lambda x: x[1], reverse=True)

        required_skills = [skill for skill, score in matches if score > threshold]

        # FAILSAFE: If no skills found, take the top 1 matches anyway
        if not required_skills:
            if debug: print("   [WARN] No skills crossed threshold. Using top 1 fallback.")
            required_skills = [matches[0][0]]

        if debug:
            print(f"   Required Skills: {required_skills}\n")

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


if __name__ == "__main__":
    people_data = [
        {"name": "Alice",   "skills": ["Python", "Django", "SQL", "AWS"]},
        {"name": "Bob",     "skills": ["React", "JavaScript", "CSS", "Figma"]},
        {"name": "Charlie", "skills": ["Python", "React", "Node.js", "SQL"]},
        {"name": "Dave",    "skills": ["Machine Learning", "Python", "Data Analysis"]},
        {"name": "Eve",     "skills": ["Docker", "Kubernetes", "AWS", "Linux"]}
    ]
    tasks_to_test = [
        "Develop a full-stack dashboard using React for the frontend and a Python API for the backend",
        "Deploy the machine learning model to the AWS cloud infrastructure using Docker containers"
    ]

    assigner = TaskAssigner(people_data)

    for task in tasks_to_test:
        print("="*60)
        ranked_people, task_skills = assigner.find_best_match(task, threshold=0.25, debug=True)
        print(f"TASK: {task}")
        print(f"SKILLS: {task_skills}")
        print("-" * 30)
        
        # Simple one-line output for all candidates
        for p in ranked_people:
            skills_str = ", ".join(p['matching_skills']) if p['matching_skills'] else "None"
            print(f"{p['name']:<20} | {p['match_percentage']}% | Has: {skills_str}")
        
        print("\n--- JSON OUTPUT ---")
        print(json.dumps(ranked_people[:2], indent=2)) # Showing top 2 in JSON as example
        print("\n")