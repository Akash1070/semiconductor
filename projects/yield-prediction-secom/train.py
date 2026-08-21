"""
Yield Prediction (SECOM) — Training Script
Predicts pass/fail semiconductor yield from process sensor data.

DATA SOURCE: REAL (SECOM dataset, UCI ML Repository) if secom.data is found,
             SYNTHETIC otherwise — labeled clearly in metrics.json and README.
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from itertools import product

BASE = Path(__file__).parent
DATA_DIR = BASE / "data"
EXPORT_DIR = BASE / "export"
EXPORT_DIR.mkdir(exist_ok=True)

SECOM_DATA = DATA_DIR / "secom.data"
SECOM_LABELS = DATA_DIR / "secom_labels.data"


# ─────────────────────────────────────────
# 1. Load or generate data
# ─────────────────────────────────────────

def load_real_data():
    print("[INFO] Loading real SECOM dataset...")
    X = pd.read_csv(SECOM_DATA, sep=" ", header=None)
    labels_df = pd.read_csv(SECOM_LABELS, sep=" ", header=None, names=["label", "timestamp"])
    y = labels_df["label"].values  # -1 = pass, 1 = fail

    print(f"[INFO] Raw X shape: {X.shape}")
    print(f"[INFO] Label dist — pass (-1): {(y==-1).sum()}, fail (1): {(y==1).sum()}")

    # Impute NaN with column median
    X = X.apply(lambda col: col.fillna(col.median()), axis=0)

    # Drop columns that are entirely NaN after imputation (all-NaN columns)
    X = X.dropna(axis=1)

    # Convert to 0/1 labels (0=pass, 1=fail)
    y_bin = (y == 1).astype(int)

    print(f"[INFO] After imputation, X shape: {X.shape}")
    print(f"[DATA SOURCE] REAL — SECOM dataset (UCI ML Repository)")
    return X.values.astype(np.float32), y_bin, [f"feature_{i}" for i in range(X.shape[1])], "REAL"


def generate_synthetic_data(n_samples=1500, n_features=40, seed=42):
    print("[WARNING] SECOM data not found. Generating SYNTHETIC DATA.")
    print("[DATA SOURCE] SYNTHETIC — Not real fab data. Generated for demo purposes only.")

    rng = np.random.RandomState(seed)
    X = rng.randn(n_samples, n_features).astype(np.float32)

    # 10 features actually drive the label
    key_features = [0, 3, 7, 11, 14, 18, 22, 25, 30, 37]
    logit = (
        1.5 * X[:, key_features[0]]
        - 1.2 * X[:, key_features[1]]
        + 0.8 * X[:, key_features[2]]
        - 1.0 * X[:, key_features[3]]
        + 0.6 * X[:, key_features[4]]
        + rng.randn(n_samples) * 0.5
    )
    prob = 1 / (1 + np.exp(-logit))
    # ~10% fail rate to mirror real SECOM
    y = (prob > 0.90).astype(int)

    print(f"[INFO] Synthetic pass: {(y==0).sum()}, fail: {(y==1).sum()}")
    feature_names = [f"feature_{i}" for i in range(n_features)]
    return X, y, feature_names, "SYNTHETIC"


if SECOM_DATA.exists() and SECOM_LABELS.exists():
    X, y, feature_names, DATA_SOURCE = load_real_data()
else:
    X, y, feature_names, DATA_SOURCE = generate_synthetic_data()


# ─────────────────────────────────────────
# 2. Train/val split
# ─────────────────────────────────────────

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_val = scaler.transform(X_val)


# ─────────────────────────────────────────
# 3. Train GradientBoosting classifier with class weighting
# ─────────────────────────────────────────

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report, precision_recall_curve
)

# Compute sample weights to handle class imbalance (fail is very rare)
sample_weights = compute_sample_weight(class_weight="balanced", y=y_train)

print("\n[INFO] Training GradientBoostingClassifier with class-balanced sample weights...")
clf = GradientBoostingClassifier(
    n_estimators=300,
    max_depth=3,
    learning_rate=0.05,
    subsample=0.8,
    random_state=42,
)
clf.fit(X_train, y_train, sample_weight=sample_weights)

y_prob = clf.predict_proba(X_val)[:, 1]

# Tune decision threshold to maximize F1 on validation set
precs, recs, thresholds = precision_recall_curve(y_val, y_prob)
f1_scores_thresh = 2 * precs * recs / (precs + recs + 1e-8)
best_thresh_idx = f1_scores_thresh.argmax()
best_threshold = float(thresholds[best_thresh_idx]) if best_thresh_idx < len(thresholds) else 0.5
print(f"[INFO] Optimal threshold (max-F1): {best_threshold:.3f}")

y_pred = (y_prob >= best_threshold).astype(int)

accuracy = float(accuracy_score(y_val, y_pred))
precision = float(precision_score(y_val, y_pred, zero_division=0))
recall = float(recall_score(y_val, y_pred, zero_division=0))
f1 = float(f1_score(y_val, y_pred, zero_division=0))

print(f"[RESULT] Accuracy: {accuracy:.4f}  Precision(fail): {precision:.4f}  Recall(fail): {recall:.4f}  F1(fail): {f1:.4f}")
print(classification_report(y_val, y_pred, target_names=["pass", "fail"], zero_division=0))


# ─────────────────────────────────────────
# 4. Feature importances — top 10
# ─────────────────────────────────────────

importances = clf.feature_importances_
top10_idx = np.argsort(importances)[::-1][:10]
top10 = [
    {"feature": feature_names[i], "feature_index": int(i), "importance": float(importances[i])}
    for i in top10_idx
]

print("\n[TOP 10 FEATURES]")
for ft in top10:
    print(f"  {ft['feature']}: {ft['importance']:.4f}")

with open(EXPORT_DIR / "feature_importance.json", "w") as f:
    json.dump({"data_source": DATA_SOURCE, "top_features": top10}, f, indent=2)
print(f"[SAVED] feature_importance.json")


# ─────────────────────────────────────────
# 5. Save metrics.json
# ─────────────────────────────────────────

metrics = {
    "data_source": DATA_SOURCE,
    "data_source_note": (
        "REAL — SECOM dataset from UCI ML Repository" if DATA_SOURCE == "REAL"
        else "SYNTHETIC — Generated data for demonstration. NOT real fab data."
    ),
    "accuracy": accuracy,
    "precision_fail": precision,
    "recall_fail": recall,
    "f1_fail": f1,
    "decision_threshold": round(best_threshold, 3),
    "val_samples": int(len(y_val)),
    "train_samples": int(len(y_train)),
    "n_features_total": X.shape[1],
    "model": "GradientBoostingClassifier (n_estimators=300, max_depth=3, class-balanced sample weights)",
    "imbalance_note": "Dataset is heavily skewed toward 'pass'. Decision threshold tuned to maximize F1 for 'fail' detection.",
    "class_distribution": {
        "pass": int((y == 0).sum()),
        "fail": int((y == 1).sum()),
    },
}

with open(EXPORT_DIR / "metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)
print(f"[SAVED] metrics.json")


# ─────────────────────────────────────────
# 6. Precompute lookup table for top-3 features
#    (for slider-based live inference in dashboard)
# ─────────────────────────────────────────

print("\n[INFO] Building lookup table for top-3 features...")
top3_idx = [top10[i]["feature_index"] for i in range(3)]
top3_names = [top10[i]["feature"] for i in range(3)]

# Use percentile grid (5th, 25th, 50th, 75th, 95th for each feature)
n_grid = 10
grids = []
for fi in top3_idx:
    col = X_val[:, fi] if len(X_val) > 0 else X[:, fi]
    lo, hi = float(np.percentile(col, 5)), float(np.percentile(col, 95))
    grids.append(np.linspace(lo, hi, n_grid).tolist())

lookup = []
for v0, v1, v2 in product(
    range(len(grids[0])),
    range(len(grids[1])),
    range(len(grids[2]))
):
    # Build a "mean" row and overwrite top-3 features
    row = np.zeros((1, X_train.shape[1]), dtype=np.float32)
    row[0, top3_idx[0]] = grids[0][v0]
    row[0, top3_idx[1]] = grids[1][v1]
    row[0, top3_idx[2]] = grids[2][v2]
    prob_fail = float(clf.predict_proba(row)[0, 1])
    lookup.append({
        "f0_idx": v0, "f1_idx": v1, "f2_idx": v2,
        "f0_val": round(grids[0][v0], 4),
        "f1_val": round(grids[1][v1], 4),
        "f2_val": round(grids[2][v2], 4),
        "prob_fail": round(prob_fail, 4),
    })

lookup_data = {
    "data_source": DATA_SOURCE,
    "top3_features": top3_names,
    "top3_feature_indices": top3_idx,
    "grid_size": n_grid,
    "grids": grids,
    "lookup": lookup,
}
with open(EXPORT_DIR / "lookup_table.json", "w") as f:
    json.dump(lookup_data, f, indent=2)
print(f"[SAVED] lookup_table.json ({len(lookup)} entries)")

print("\n[DONE] Yield prediction (SECOM) training complete.")
print(f"  Accuracy: {accuracy:.4f} | Precision(fail): {precision:.4f} | Recall(fail): {recall:.4f} | F1(fail): {f1:.4f}")
print(f"  Data source: {DATA_SOURCE}")
