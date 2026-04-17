# Benchmark Results Summary

Source: ML/benchmark_results.json

## Dataset
- Samples: 267
- Class distribution: High 79, Medium 94, Low 70, Critical 24
- Evaluation policy: Unseen test splits used for statistical models

## 1) Task Priority Model (SetFit)
- Evaluation: Repeated stratified holdout (3 runs, 25% unseen test each run)
- Accuracy (mean +/- std): 0.8806 +/- 0.0122
- Macro F1 (mean +/- std): 0.8195 +/- 0.0040
- Train time (mean): 541.719 s
- Inference latency (mean): 1.929 ms/sample
- Aggregate confusion matrix labels: [Low, Medium, High, Critical]
- Aggregate confusion matrix:
  - [40, 11, 0, 0]
  - [1, 71, 0, 0]
  - [0, 1, 58, 1]
  - [0, 0, 10, 8]
- Note: Out-of-sample benchmark using unseen test splits to avoid train/test leakage.

## 2) Skill Matcher Model (SentenceTransformer)
- Train samples: 200
- Test samples: 67
- Model load: 0.0681 s
- Encode latency: 2.011 ms/sample
- Embedding dimension: 384
- Proxy top-1 neighbor label accuracy: 0.7015
- Proxy top-3 neighbor hit rate: 0.8657
- Proxy silhouette (cosine): 0.0133
- Note: Proxy retrieval benchmark on holdout split (no explicit skill-matching ground-truth labels in repo).

## 3) Task Assigner Runtime
- Candidates per run: 300
- Runs: 30
- Average latency: 26.787 ms
- Note: Runtime benchmark only (no labeled assignee ground-truth dataset found).

## 4) Urgency Rule Model
- Grid cases tested: 3960
- Score range: min 0.0, mean 45.775, max 218.4
- Label distribution: Critical 771, High 677, Moderate 639, Low 883, Completed 990
- Throughput: 2,239,303.13 predictions/sec
- Average prediction time: 0.447 microseconds
- Note: Rule-based model; behavior coverage and runtime are reported instead of statistical accuracy.

## 5) Wellness Rule Model
- Grid cases tested: 1056
- Score range: min 0.0, mean 15.185, max 100.0
- Status distribution: Healthy Balance 23, Nearing Capacity 59, Overworked 119, Burnout Risk 855
- Throughput: 3,373,159.10 predictions/sec
- Average prediction time: 0.296 microseconds
- Note: Rule-based model; behavior coverage and runtime are reported instead of statistical accuracy.
