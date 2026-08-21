"""
Wafer Defect Classifier — Data Preparation
Loads real WM-811K data (LSWMD.pkl) or generates synthetic fallback.
"""

import os
import pickle
import numpy as np
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
PKL_PATH = DATA_DIR / "LSWMD.pkl"
OUT_DIR = Path(__file__).parent / "processed"
OUT_DIR.mkdir(exist_ok=True)

DEFECT_CLASSES = ["Center", "Donut", "Edge-Loc", "Edge-Ring", "Loc", "Random", "Scratch", "none"]
MAP_SIZE = 32

def resize_wafer_map(wm, size=MAP_SIZE):
    """Resize wafer map to size x size using nearest-neighbor."""
    from PIL import Image
    arr = np.array(wm, dtype=np.float32)
    img = Image.fromarray(arr)
    img = img.resize((size, size), Image.NEAREST)
    return np.array(img)

def load_real_data():
    print("[INFO] Loading real WM-811K dataset from LSWMD.pkl ...")
    # LSWMD.pkl was pickled with old pandas (Python 2) — patch sys.modules
    import pandas
    import pandas.core.indexes
    import sys
    sys.modules.setdefault('pandas.indexes', pandas.core.indexes)
    sys.modules.setdefault('pandas.indexes.base', pandas.core.indexes.base)
    if not hasattr(pandas, 'indexes'):
        pandas.indexes = pandas.core.indexes

    import pickle
    import pandas as pd
    with open(PKL_PATH, "rb") as f:
        df = pickle.load(f, encoding='latin1')  # Python 2 pickle requires latin1

    print(f"[INFO] Loaded {len(df)} records. Columns: {list(df.columns)}")


    # Extract label from failureType — stored as numpy array [['ClassName']]
    import numpy as np

    def extract_label(x):
        """WM-811K stores failureType as numpy arrays like array([['none']], dtype='<U4')"""
        try:
            if hasattr(x, 'flatten'):  # numpy array
                flat = x.flatten()
                return str(flat[0]) if len(flat) > 0 else ''
            elif isinstance(x, (list, tuple)) and len(x) > 0:
                inner = x[0]
                if isinstance(inner, (list, tuple)) and len(inner) > 0:
                    return str(inner[0])
                return str(inner)
            return ''
        except Exception:
            return ''

    df["label"] = df["failureType"].apply(extract_label)
    df = df[df["label"].isin(DEFECT_CLASSES)]

    print(f"[INFO] After filtering: {len(df)} records with valid labels")
    print("[INFO] Class distribution:")
    for cls in DEFECT_CLASSES:
        count = (df["label"] == cls).sum()
        print(f"  {cls}: {count} ({100*count/len(df):.1f}%)")

    # Resize wafer maps
    X = []
    y = []
    label_to_idx = {c: i for i, c in enumerate(DEFECT_CLASSES)}
    for _, row in df.iterrows():
        try:
            wm = resize_wafer_map(row["waferMap"])
            X.append(wm)
            y.append(label_to_idx[row["label"]])
        except Exception:
            continue

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)

    # Normalize to [0, 1] — wafer maps are typically 0/1/2
    X = X / 2.0
    X = X[..., np.newaxis]  # add channel dim

    np.save(OUT_DIR / "X.npy", X)
    np.save(OUT_DIR / "y.npy", y)
    np.save(OUT_DIR / "classes.npy", np.array(DEFECT_CLASSES))

    print(f"[INFO] Saved X.npy shape={X.shape}, y.npy shape={y.shape}")
    print("[DATA SOURCE] REAL — WM-811K public dataset (Kaggle: qingyi/wm811k-wafer-map)")
    return X, y, DEFECT_CLASSES, "REAL"

def generate_synthetic_data(n_samples=2000, seed=42):
    """Generate synthetic wafer map data with geometric patterns."""
    print("[WARNING] LSWMD.pkl not found. Generating SYNTHETIC DATA.")
    print("[DATA SOURCE] SYNTHETIC — Not real fab data. Generated for demo purposes only.")

    rng = np.random.RandomState(seed)
    # Simulate ~70% 'none', 30% distributed across defect classes
    class_weights = [0.05, 0.04, 0.05, 0.05, 0.05, 0.04, 0.02, 0.70]
    counts = (np.array(class_weights) * n_samples).astype(int)
    counts[-1] = n_samples - counts[:-1].sum()

    X, y = [], []
    label_to_idx = {c: i for i, c in enumerate(DEFECT_CLASSES)}

    coords = np.mgrid[0:MAP_SIZE, 0:MAP_SIZE]
    cx, cy = MAP_SIZE // 2, MAP_SIZE // 2
    R = MAP_SIZE // 2 - 2

    for cls_idx, (cls, n) in enumerate(zip(DEFECT_CLASSES, counts)):
        for _ in range(n):
            wm = np.zeros((MAP_SIZE, MAP_SIZE), dtype=np.float32)
            if cls == "Center":
                r = rng.randint(3, 7)
                mask = ((coords[0] - cx)**2 + (coords[1] - cy)**2) < r**2
                wm[mask] = 1.0
            elif cls == "Donut":
                r1, r2 = rng.randint(5, 8), rng.randint(9, 13)
                dist = np.sqrt((coords[0] - cx)**2 + (coords[1] - cy)**2)
                wm[(dist > r1) & (dist < r2)] = 1.0
            elif cls == "Edge-Loc":
                angle = rng.uniform(0, 2 * np.pi)
                arc = np.abs(np.arctan2(coords[0] - cx, coords[1] - cy) - angle)
                arc = np.minimum(arc, 2 * np.pi - arc)
                dist = np.sqrt((coords[0] - cx)**2 + (coords[1] - cy)**2)
                wm[(arc < 0.4) & (dist > R - 4)] = 1.0
            elif cls == "Edge-Ring":
                dist = np.sqrt((coords[0] - cx)**2 + (coords[1] - cy)**2)
                wm[(dist > R - 3) & (dist < R + 1)] = 1.0
            elif cls == "Loc":
                lx, ly = rng.randint(5, MAP_SIZE - 5, 2)
                r = rng.randint(2, 5)
                mask = ((coords[0] - lx)**2 + (coords[1] - ly)**2) < r**2
                wm[mask] = 1.0
            elif cls == "Random":
                wm = rng.rand(MAP_SIZE, MAP_SIZE) > 0.85
                wm = wm.astype(np.float32)
            elif cls == "Scratch":
                x0, x1 = rng.randint(0, MAP_SIZE, 2)
                y0, y1 = rng.randint(0, MAP_SIZE, 2)
                pts = np.linspace(0, 1, 50)
                for t in pts:
                    px = int(x0 + t * (x1 - x0))
                    py = int(y0 + t * (y1 - y0))
                    if 0 <= px < MAP_SIZE and 0 <= py < MAP_SIZE:
                        wm[px, py] = 1.0
            else:  # none
                pass

            # Add noise
            noise = rng.rand(MAP_SIZE, MAP_SIZE) * 0.1
            wm = np.clip(wm + noise, 0, 1)
            X.append(wm)
            y.append(cls_idx)

    X = np.array(X, dtype=np.float32)[..., np.newaxis]
    y = np.array(y, dtype=np.int32)

    # Shuffle
    idx = rng.permutation(len(X))
    X, y = X[idx], y[idx]

    np.save(OUT_DIR / "X.npy", X)
    np.save(OUT_DIR / "y.npy", y)
    np.save(OUT_DIR / "classes.npy", np.array(DEFECT_CLASSES))

    print(f"[INFO] Synthetic data saved. X.npy shape={X.shape}")
    return X, y, DEFECT_CLASSES, "SYNTHETIC"

if __name__ == "__main__":
    if PKL_PATH.exists():
        load_real_data()
    else:
        generate_synthetic_data()
