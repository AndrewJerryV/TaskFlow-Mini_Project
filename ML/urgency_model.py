class UrgencyModel:
    def __init__(self):
        # CONFIGURATION: Tweak these weights to fit your team's style
        self.PRIORITY_SCORES = {
            "High": 40,
            "Medium": 20,
            "Low": 10
        }
        
        self.STATUS_MULTIPLIERS = {
            "To Do": 1.2,      # Not started yet? Higher urgency.
            "In Progress": 1.0, # Being worked on? Standard urgency.
            "In Review": 0.5,   # Almost done? Lower urgency.
            "Done": 0.0         # Done? Zero urgency.
        }

    def predict(self, priority, status, days_until_due, days_since_update):
        """
        Calculates an urgency score (0-100+).
        
        Formula:
        (Priority Score + Deadline Pressure + Stagnation Penalty) * Status Multiplier
        """
        
        # 1. Base Score from Priority
        # Default to Low (10) if priority is unknown
        score = self.PRIORITY_SCORES.get(priority, 10)
        
        # 2. Deadline Pressure (The closer the date, the higher the score)
        # If due in 0 days (today), add 50 points.
        # If due in 10 days, add 0 points.
        # If overdue (negative days), add massive points (10 per day overdue).
        if days_until_due <= 0:
            # Overdue! Add 50 base + 10 for every day late
            score += 50 + (abs(days_until_due) * 10)
        elif days_until_due <= 7:
            # Due this week. Add points (Linear scale: 35 pts for 1 day, 5 pts for 7 days)
            score += (7 - days_until_due) * 5
        
        # 3. Stagnation Penalty (Has it been sitting idle?)
        # If no updates for 5 days, start adding urgency to "nudge" it.
        if days_since_update > 3:
            score += (days_since_update - 3) * 2  # Add 2 points per idle day

        # 4. Apply Status Multiplier
        # If it's "Done", score becomes 0. If "In Review", score is halved.
        multiplier = self.STATUS_MULTIPLIERS.get(status, 1.0)
        final_score = score * multiplier

        # 5. Cap the score at 100 (optional, but good for UI bars)
        # We allow >100 for "Critical Overdue" cases internally, 
        # but for display, you might want to cap it.
        return round(final_score, 1)

    def get_urgency_label(self, score):
        """Returns a human-readable label for the score."""
        if score == 0: return "Completed"
        if score >= 80: return "Critical"
        if score >= 50: return "High"
        if score >= 30: return "Moderate"
        return "Low"

# =========================================
# EXAMPLE USAGE
# =========================================
if __name__ == "__main__":
    model = UrgencyModel()

    test_cases = [
        # Case 1: High Priority, Due Tomorrow, Just updated (Should be Critical)
        {"p": "High", "s": "To Do", "due": 1, "update": 0},
        
        # Case 2: Medium Priority, Due in 2 weeks (Should be Low)
        {"p": "Medium", "s": "To Do", "due": 14, "update": 1},
        
        # Case 3: Low Priority, But Overdue by 5 days! (Should be High/Critical)
        {"p": "Low", "s": "In Progress", "due": -5, "update": 2},
        
        # Case 4: High Priority, but In Review (Should be Moderate)
        {"p": "High", "s": "In Review", "due": 2, "update": 0},
        
        # Case 5: The "Forgotten" Task (Low priority, but no updates for 30 days)
        {"p": "Low", "s": "To Do", "due": 30, "update": 30},

        # Case 6. The "Completed" Case: High Priority, Overdue, BUT Done!
        # This proves the logic works: Even if it was urgent, if it's done, it's 0.
        {"p": "High", "s": "Done", "due": -2, "update": 0},
    ]

    print(f"{'PRIORITY':<10} | {'STATUS':<12} | {'DUE':<4} | {'IDLE':<4} || {'SCORE':<6} | {'LABEL'}")
    print("-" * 75)

    for t in test_cases:
        score = model.predict(t['p'], t['s'], t['due'], t['update'])
        label = model.get_urgency_label(score)
        print(f"{t['p']:<10} | {t['s']:<12} | {t['due']:<4} | {t['update']:<4} || {score:<6} | {label}")