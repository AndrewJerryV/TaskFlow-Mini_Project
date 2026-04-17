import json
import os
import random
import time
from collections import Counter

import numpy as np
from datasets import Dataset
from sentence_transformers import SentenceTransformer, util
from setfit import SetFitModel, Trainer, TrainingArguments
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
    silhouette_score,
)
from sklearn.model_selection import train_test_split

from models import TaskAssigner, UrgencyModel
from wellness_model import WellnessModel


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.txt")
PRIORITY_MODEL_PATH = os.path.join(BASE_DIR, "my_setfit_model_critical")
SKILL_MODEL_PATH = os.path.join(BASE_DIR, "skill_matcher_model")
OUT_FILE = os.path.join(BASE_DIR, "benchmark_results.json")

LABEL_TO_ID = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
ID_TO_LABEL = {v: k for k, v in LABEL_TO_ID.items()}


def load_dataset(path):
    texts = []
    labels = []
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            try:
                text, label = line.rsplit(" | ", 1)
            except ValueError:
                continue
            normalized = label.strip().capitalize()
            if normalized in LABEL_TO_ID:
                texts.append(text.strip())
                labels.append(LABEL_TO_ID[normalized])
    return texts, np.array(labels, dtype=int)


def _compute_classification_metrics(y_true, y_pred):
    accuracy = accuracy_score(y_true, y_pred)
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3]).tolist()
    report = classification_report(
        y_true,
        y_pred,
        labels=[0, 1, 2, 3],
        target_names=["Low", "Medium", "High", "Critical"],
        zero_division=0,
        output_dict=True,
    )

    return {
        "accuracy": round(float(accuracy), 4),
        "precision_macro": round(float(precision_macro), 4),
        "recall_macro": round(float(recall_macro), 4),
        "f1_macro": round(float(f1_macro), 4),
        "precision_weighted": round(float(precision_weighted), 4),
        "recall_weighted": round(float(recall_weighted), 4),
        "f1_weighted": round(float(f1_weighted), 4),
        "confusion_matrix_labels": ["Low", "Medium", "High", "Critical"],
        "confusion_matrix": cm,
        "classification_report": report,
    }


def _train_setfit_model(train_texts, train_labels):
    train_dataset = Dataset.from_dict({"text": train_texts, "label": train_labels.tolist()})
    model = SetFitModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

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
    return model


def benchmark_priority_model(texts, labels):
    seeds = [42, 123, 999]
    test_size = 0.25

    run_metrics = []
    aggregate_cm = np.zeros((4, 4), dtype=int)
    train_secs = []
    infer_secs = []
    infer_ms_per_sample = []

    for seed in seeds:
        x_train, x_test, y_train, y_test = train_test_split(
            texts,
            labels,
            test_size=test_size,
            random_state=seed,
            stratify=labels,
        )

        train_start = time.perf_counter()
        model = _train_setfit_model(x_train, y_train)
        train_sec = time.perf_counter() - train_start

        infer_start = time.perf_counter()
        y_pred = model.predict(x_test)
        infer_sec = time.perf_counter() - infer_start

        metrics = _compute_classification_metrics(y_test, y_pred)
        metrics["seed"] = seed
        metrics["train_samples"] = int(len(x_train))
        metrics["test_samples"] = int(len(x_test))
        metrics["train_seconds"] = round(train_sec, 4)
        metrics["inference_total_seconds"] = round(infer_sec, 4)
        metrics["inference_avg_ms_per_sample"] = round((infer_sec / max(1, len(x_test))) * 1000, 3)
        run_metrics.append(metrics)

        aggregate_cm += np.array(metrics["confusion_matrix"], dtype=int)
        train_secs.append(train_sec)
        infer_secs.append(infer_sec)
        infer_ms_per_sample.append((infer_sec / max(1, len(x_test))) * 1000)

    avg_accuracy = float(np.mean([m["accuracy"] for m in run_metrics]))
    std_accuracy = float(np.std([m["accuracy"] for m in run_metrics]))
    avg_f1_macro = float(np.mean([m["f1_macro"] for m in run_metrics]))
    std_f1_macro = float(np.std([m["f1_macro"] for m in run_metrics]))

    return {
        "samples_total": int(len(texts)),
        "class_distribution": {ID_TO_LABEL[k]: int(v) for k, v in Counter(labels).items()},
        "evaluation": "Repeated stratified holdout (3 runs, 25% unseen test each run)",
        "accuracy_mean": round(avg_accuracy, 4),
        "accuracy_std": round(std_accuracy, 4),
        "f1_macro_mean": round(avg_f1_macro, 4),
        "f1_macro_std": round(std_f1_macro, 4),
        "train_seconds_mean": round(float(np.mean(train_secs)), 4),
        "inference_total_seconds_mean": round(float(np.mean(infer_secs)), 4),
        "inference_avg_ms_per_sample_mean": round(float(np.mean(infer_ms_per_sample)), 3),
        "holdout_runs": run_metrics,
        "confusion_matrix_labels": ["Low", "Medium", "High", "Critical"],
        "aggregate_confusion_matrix": aggregate_cm.tolist(),
        "note": "Out-of-sample benchmark using unseen test splits to avoid train/test leakage.",
    }


def benchmark_skill_model(texts, labels):
    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.25,
        random_state=42,
        stratify=labels,
    )

    start = time.perf_counter()
    model = SentenceTransformer(SKILL_MODEL_PATH)
    load_sec = time.perf_counter() - start

    encode_start = time.perf_counter()
    emb_train = model.encode(x_train, convert_to_tensor=True, normalize_embeddings=True)
    emb_test = model.encode(x_test, convert_to_tensor=True, normalize_embeddings=True)
    encode_sec = time.perf_counter() - encode_start

    sim = util.cos_sim(emb_test, emb_train).cpu().numpy()

    top1_idx = np.argmax(sim, axis=1)
    top1_match = (y_train[top1_idx] == y_test).mean()

    top3_idx = np.argpartition(-sim, kth=3, axis=1)[:, :3]
    top3_match = np.mean([y_test[i] in y_train[idxs] for i, idxs in enumerate(top3_idx)])

    emb_test_np = emb_test.cpu().numpy()
    sil = silhouette_score(emb_test_np, y_test, metric="cosine")

    return {
        "train_samples": int(len(x_train)),
        "test_samples": int(len(x_test)),
        "model_load_seconds": round(load_sec, 4),
        "encode_total_seconds": round(encode_sec, 4),
        "encode_avg_ms_per_sample": round((encode_sec / max(1, len(x_train) + len(x_test))) * 1000, 3),
        "embedding_dim": int(emb_test_np.shape[1]),
        "proxy_top1_neighbor_label_accuracy": round(float(top1_match), 4),
        "proxy_top3_neighbor_label_hit_rate": round(float(top3_match), 4),
        "proxy_silhouette_cosine": round(float(sil), 4),
        "note": "Holdout proxy benchmark: nearest-neighbor retrieval from unseen test texts to train texts. No labeled skill-matching ground truth found.",
    }


def benchmark_task_assigner_runtime():
    skill_model = SentenceTransformer(SKILL_MODEL_PATH)
    assigner = TaskAssigner(skill_model)
    wellness = WellnessModel()

    skill_pool = [
        "React", "Next.js", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Supabase", "Docker",
        "Tailwind CSS", "Node.js", "GraphQL", "AWS", "CI/CD", "Testing", "Machine Learning", "Figma",
    ]

    random.seed(42)
    candidates = []
    for i in range(300):
        picked = random.sample(skill_pool, k=random.randint(3, 7))
        candidates.append(
            {
                "id": f"u{i}",
                "name": f"Member {i}",
                "role": "Member" if i % 5 else "Manager",
                "skills": picked,
                "wellness_data": {
                    "active_tasks": random.randint(1, 10),
                    "high_priority_count": random.randint(0, 4),
                    "critical_urgency_count": random.randint(0, 2),
                },
            }
        )

    query = "Fix login auth flow in Next.js app, update Supabase policies, and improve UI button styles."

    warmup_runs = 5
    measured_runs = 30

    for _ in range(warmup_runs):
        assigner.find_best_match(query, candidates, wellness_model=wellness)

    start = time.perf_counter()
    for _ in range(measured_runs):
        ranked, req = assigner.find_best_match(query, candidates, wellness_model=wellness)
    total_sec = time.perf_counter() - start

    return {
        "candidates_per_run": len(candidates),
        "runs": measured_runs,
        "avg_latency_ms": round((total_sec / measured_runs) * 1000, 3),
        "p95_latency_ms_estimate": None,
        "top_candidate_example": ranked[0]["name"] if ranked else None,
        "required_skills_example": req,
        "note": "Runtime benchmark only; no labeled assignee ground truth dataset found.",
    }


def benchmark_urgency_model():
    model = UrgencyModel()

    priorities = ["Low", "Medium", "High"]
    statuses = ["To Do", "In Progress", "In Review", "Done"]

    scores = []
    for p in priorities:
        for s in statuses:
            for due in range(-7, 15):
                for stale in range(0, 15):
                    scores.append(model.predict(p, s, due, stale))

    label_counts = Counter(UrgencyModel.label(v) for v in scores)

    start = time.perf_counter()
    for _ in range(200000):
        model.predict("High", "In Progress", 2, 6)
    bench_sec = time.perf_counter() - start

    return {
        "grid_cases_tested": len(scores),
        "score_min": float(np.min(scores)),
        "score_mean": round(float(np.mean(scores)), 3),
        "score_max": float(np.max(scores)),
        "label_distribution": dict(label_counts),
        "throughput_preds_per_sec": round(200000 / bench_sec, 2),
        "avg_us_per_prediction": round((bench_sec / 200000) * 1e6, 3),
        "note": "Rule-based model; benchmark reports behavior coverage and runtime, not statistical accuracy.",
    }


def benchmark_wellness_model():
    model = WellnessModel()

    scores = []
    statuses = Counter()
    for active in range(0, 16):
        for high in range(0, 11):
            for critical in range(0, 6):
                val = model.calculate(active, high, critical)
                scores.append(val)
                statuses[model.get_status(val)] += 1

    start = time.perf_counter()
    for _ in range(200000):
        model.calculate(8, 3, 1)
    bench_sec = time.perf_counter() - start

    return {
        "grid_cases_tested": len(scores),
        "score_min": float(np.min(scores)),
        "score_mean": round(float(np.mean(scores)), 3),
        "score_max": float(np.max(scores)),
        "status_distribution": dict(statuses),
        "throughput_preds_per_sec": round(200000 / bench_sec, 2),
        "avg_us_per_prediction": round((bench_sec / 200000) * 1e6, 3),
        "note": "Rule-based model; benchmark reports behavior coverage and runtime, not statistical accuracy.",
    }


def main():
    texts, labels = load_dataset(DATA_FILE)
    if len(texts) == 0:
        raise RuntimeError("No valid labeled samples found in data.txt")

    output = {
        "generated_at_epoch": int(time.time()),
        "dataset": {
            "file": DATA_FILE,
            "samples": len(texts),
            "class_distribution": {ID_TO_LABEL[k]: int(v) for k, v in Counter(labels).items()},
        },
        "models": {
            "task_priority_setfit": benchmark_priority_model(texts, labels),
            "skill_matcher_sentence_transformer": benchmark_skill_model(texts, labels),
            "task_assigner_runtime": benchmark_task_assigner_runtime(),
            "urgency_rule_model": benchmark_urgency_model(),
            "wellness_rule_model": benchmark_wellness_model(),
        },
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(json.dumps(output, indent=2))
    print(f"\nSaved benchmark report to: {OUT_FILE}")


if __name__ == "__main__":
    main()
