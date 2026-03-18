import os
from setfit import SetFitModel, Trainer, TrainingArguments
from datasets import Dataset

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.txt")
MODEL_EXPORT_PATH = os.path.join(BASE_DIR, "my_setfit_model_critical")

# 1. Load Data
texts = []
labels = []
label_map = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}

print(f"Loading data from {DATA_FILE}")
with open(DATA_FILE, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            # Data format: "Description text | Priority"
            text, priority = line.rsplit(" | ", 1)
            # Standardize priority case
            priority = priority.strip().capitalize()
            if priority in label_map:
                texts.append(text.strip())
                labels.append(label_map[priority])
        except ValueError:
            print(f"Skipping incorrectly formatted line: {line}")

if not texts:
    print("No valid data found to train on!")
    exit(1)

print(f"Loaded {len(texts)} training samples.")

# 2. Create Dataset
train_dataset = Dataset.from_dict({
    "text": texts,
    "label": labels
})

# 3. Load Base Model
# Starting from a fast, capable base sentence transformer
print("Loading base SetFit model (all-MiniLM-L6-v2)...")
model = SetFitModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

# 4. Train Model
print("Starting training...")
args = TrainingArguments(
    batch_size=16,
    num_epochs=1,
    evaluation_strategy="no",
    save_strategy="no",
    load_best_model_at_end=False,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_dataset,
)

trainer.train()

# 5. Save Model
print(f"Saving trained model to {MODEL_EXPORT_PATH}")
model.save_pretrained(MODEL_EXPORT_PATH)
print("Training complete! The model has been successfully updated.")
