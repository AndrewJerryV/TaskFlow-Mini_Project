class WellnessModel:
    def __init__(self):
        self.COMFORTABLE_LOAD = 4 
        
        self.PENALTY_PER_EXTRA_TASK = 5      
        self.PENALTY_HIGH_PRIORITY = 8       
        self.PENALTY_CRITICAL_URGENCY = 15   
        self.PENALTY_CONTEXT_SWITCH = 2      

    def calculate(self, active_tasks, high_priority_count, critical_urgency_count):
        """
        Calculates a Wellness/Health score (0-100).
        100 = Perfect balance. < 30 = Burnout risk.
        """
        score = 100
        
        if active_tasks > self.COMFORTABLE_LOAD:
            extra_tasks = active_tasks - self.COMFORTABLE_LOAD
            score -= (extra_tasks * self.PENALTY_PER_EXTRA_TASK)
            
            score -= (extra_tasks * self.PENALTY_CONTEXT_SWITCH)
            
        score -= (high_priority_count * self.PENALTY_HIGH_PRIORITY)
        score -= (critical_urgency_count * self.PENALTY_CRITICAL_URGENCY)
        
        final_score = max(0, min(100, score))
        
        return final_score

    def get_status(self, score):
        if score >= 80: return "Healthy Balance"
        if score >= 60: return "Nearing Capacity"
        if score >= 35: return "Overworked"
        return "Burnout Risk"
