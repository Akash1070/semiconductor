"""
Wafer Defect Classifier — Training Script
Trains a small CNN on 32x32 wafer maps, exports to TF.js format.

DATA SOURCE: REAL (WM-811K) if processed/X.npy exists and was built from LSWMD.pkl,
             SYNTHETIC otherwise — labeled clearly in metrics.json and README.
"""

import os
import json
import shutil
import numpy as np
from pathlib import Path

BASE = Path(__file__).parent
PROC_DIR = BASE / "processed"
EXPORT_DIR = BASE / "export"
SAMPLES_DIR = EXPORT_DIR / "samples"
TFJS_DIR = EXPORT_DIR / "tfjs_model"
EXPORT_DIR.mkdir(exist_ok=True)
SAMPLES_DIR.mkdir(exist_ok=True)
TFJS_DIR.mkdir(exist_ok=True)

# ---------- Detect data source ----------
DATA_SOURCE = "UNKNOWN"
if (BASE / "data" / "LSWMD.pkl").exists() and (PROC_DIR / "X.npy").exists():
    DATA_SOURCE = "REAL"
elif (PROC_DIR / "X.npy").exists():
    DATA_SOURCE = "SYNTHETIC"

# ---------- Run data_prep if needed ----------
if not (PROC_DIR / "X.npy").exists():
    print("[INFO] Running data_prep.py first...")
    import data_prep
    if (BASE / "data" / "LSWMD.pkl").exists():
        X, y, CLASSES, DATA_SOURCE = data_prep.load_real_data()
    else:
        X, y, CLASSES, DATA_SOURCE = data_prep.generate_synthetic_data()
else:
    X = np.load(PROC_DIR / "X.npy")
    y = np.load(PROC_DIR / "y.npy")
    CLASSES = list(np.load(PROC_DIR / "classes.npy"))
    # Re-detect source
    if (BASE / "data" / "LSWMD.pkl").exists():
        DATA_SOURCE = "REAL"
    else:
        DATA_SOURCE = "SYNTHETIC"

print(f"\n[DATA SOURCE] {DATA_SOURCE}")
print(f"[INFO] X shape: {X.shape}, y shape: {y.shape}")
print(f"[INFO] Classes: {CLASSES}")

# ---------- Train/val split ----------
from sklearn.model_selection import train_test_split
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# ---------- Class weights for imbalance ----------
from sklearn.utils.class_weight import compute_class_weight
unique_classes = np.unique(y_train)
weights = compute_class_weight("balanced", classes=unique_classes, y=y_train)
class_weight_dict = {int(c): float(w) for c, w in zip(unique_classes, weights)}
print(f"[INFO] Class weights: {class_weight_dict}")

# ---------- Build CNN ----------
import tensorflow as tf
from tensorflow import keras

model = keras.Sequential([
    keras.layers.Input(shape=(32, 32, 1)),
    keras.layers.Conv2D(32, 3, activation="relu", padding="same"),
    keras.layers.BatchNormalization(),
    keras.layers.MaxPooling2D(2),
    keras.layers.Conv2D(64, 3, activation="relu", padding="same"),
    keras.layers.BatchNormalization(),
    keras.layers.MaxPooling2D(2),
    keras.layers.Conv2D(128, 3, activation="relu", padding="same"),
    keras.layers.GlobalAveragePooling2D(),
    keras.layers.Dense(64, activation="relu"),
    keras.layers.Dropout(0.4),
    keras.layers.Dense(len(CLASSES), activation="softmax"),
])

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)
model.summary()

# ---------- Train ----------
EPOCHS = 15
BATCH = 64

history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH,
    class_weight=class_weight_dict,
    verbose=1,
)

# ---------- Evaluate ----------
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report, confusion_matrix
)

y_pred_probs = model.predict(X_val, verbose=0)
y_pred = np.argmax(y_pred_probs, axis=1)

accuracy = float(accuracy_score(y_val, y_pred))
macro_f1 = float(f1_score(y_val, y_pred, average="macro", zero_division=0))
per_class = classification_report(y_val, y_pred, target_names=CLASSES, output_dict=True, zero_division=0)

print(f"\n[RESULT] Accuracy: {accuracy:.4f}  |  Macro-F1: {macro_f1:.4f}")
print(classification_report(y_val, y_pred, target_names=CLASSES, zero_division=0))

# ---------- Save metrics.json ----------
metrics = {
    "data_source": DATA_SOURCE,
    "data_source_note": (
        "REAL — WM-811K public dataset (Kaggle: qingyi/wm811k-wafer-map)" if DATA_SOURCE == "REAL"
        else "SYNTHETIC — Generated data for demonstration purposes. NOT real fab data."
    ),
    "accuracy": accuracy,
    "macro_f1": macro_f1,
    "val_samples": int(len(y_val)),
    "train_samples": int(len(y_train)),
    "classes": CLASSES,
    "per_class_report": {k: v for k, v in per_class.items() if k in CLASSES},
    "training_epochs": EPOCHS,
    "model_architecture": "CNN: Conv32→BN→Pool → Conv64→BN→Pool → Conv128→GAP → Dense64→Dropout→Softmax",
}

with open(EXPORT_DIR / "metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)
print(f"[SAVED] {EXPORT_DIR / 'metrics.json'}")

# ---------- Save 20 sample PNG images ----------
from PIL import Image
import random

n_samples = 20
# Pick stratified samples across classes
sample_indices = []
for cls_idx in range(len(CLASSES)):
    cls_mask = np.where(y_val == cls_idx)[0]
    if len(cls_mask) > 0:
        sample_indices.append(int(cls_mask[0]))

# Fill up to 20 with random picks
remaining = list(range(len(y_val)))
random.shuffle(remaining)
for idx in remaining:
    if idx not in sample_indices and len(sample_indices) < n_samples:
        sample_indices.append(idx)
sample_indices = sample_indices[:n_samples]

sample_manifest = []
for i, idx in enumerate(sample_indices):
    wm = X_val[idx, :, :, 0]  # (32,32)
    true_label = CLASSES[y_val[idx]]
    pred_label = CLASSES[y_pred[idx]]
    pred_prob = float(np.max(y_pred_probs[idx]))

    # Scale to 0-255 and save as PNG
    img_arr = (wm * 255).astype(np.uint8)
    img = Image.fromarray(img_arr, mode="L").resize((128, 128), Image.NEAREST)
    fname = f"sample_{i:02d}_{true_label}.png"
    img.save(SAMPLES_DIR / fname)

    sample_manifest.append({
        "filename": fname,
        "true_label": true_label,
        "pred_label": pred_label,
        "pred_prob": round(pred_prob, 4),
    })

with open(EXPORT_DIR / "sample_manifest.json", "w") as f:
    json.dump({"samples": sample_manifest, "data_source": DATA_SOURCE}, f, indent=2)
print(f"[SAVED] {n_samples} sample images to {SAMPLES_DIR}")

# ---------- Export to TF.js ----------
print("\n[INFO] Exporting model to TensorFlow.js format...")
try:
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, str(TFJS_DIR))
    print(f"[SAVED] TF.js model to {TFJS_DIR}")
except ImportError:
    print("[WARNING] tensorflowjs not installed. Saving Keras H5 model instead.")
    model.save(EXPORT_DIR / "model.h5")
    print("[INFO] Install tensorflowjs and run: tensorflowjs_converter --input_format=keras export/model.h5 export/tfjs_model")

print("\n[DONE] Wafer defect classifier training complete.")
print(f"  Accuracy: {accuracy:.4f}")
print(f"  Macro-F1: {macro_f1:.4f}")
print(f"  Data source: {DATA_SOURCE}")
