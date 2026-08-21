# Wafer Defect Classifier

CNN-based classification of 32×32 wafer map images into 8 defect types.

## Data Source

This project runs against the **real WM-811K dataset** (LSWMD.pkl from Kaggle) if you
place it in `data/`. If the file is missing, `data_prep.py` generates **clearly-labeled
SYNTHETIC** data instead — this is always surfaced in `export/metrics.json` and the dashboard.

## Defect Classes

Center, Donut, Edge-Loc, Edge-Ring, Loc, Random, Scratch, none

## Running

```bash
pip install -r requirements.txt
python data_prep.py   # loads/preprocesses data → processed/
python train.py       # trains CNN, exports TF.js model + metrics
```

## Outputs

| File | Description |
|------|-------------|
| `export/metrics.json` | accuracy, macro-F1, per-class report, data source label |
| `export/sample_manifest.json` | 20 sample images with true/predicted labels |
| `export/samples/*.png` | 128×128 wafer map PNGs |
| `export/tfjs_model/` | TensorFlow.js model files for browser inference |

## Model

Small CNN: Conv32 → BN → MaxPool → Conv64 → BN → MaxPool → Conv128 → GAP → Dense64 → Dropout → Softmax

Class-weighted training to compensate for the heavy "none" imbalance (~70% of real data).

## Why macro-F1 < accuracy

When ~70% of samples are "none", a classifier that nails "none" but struggles on rare
classes (Donut, Scratch) will score high accuracy but low macro-F1. Macro-F1 averages
F1 equally across all 8 classes — it penalizes you for ignoring rare patterns.
