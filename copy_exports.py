"""
copy_exports.py — Copy ML export files into dashboard/public/exports/
Run this before `npm run build` or `npm run dev` in the dashboard.
"""

import shutil
from pathlib import Path

ROOT = Path(__file__).parent

def ensure(path):
    path.mkdir(parents=True, exist_ok=True)

def copy_if(src, dst):
    if src.exists():
        shutil.copy2(src, dst)
        print(f"  [OK] {src.name}")
    else:
        print(f"  [MISSING] {src} — skipped")

# Destinations
wafer_dir = ROOT / "dashboard/public/exports/wafer"
wafer_samples = wafer_dir / "samples"
wafer_tfjs = wafer_dir / "tfjs_model"
yield_dir = ROOT / "dashboard/public/exports/yield"
overlay_dir = ROOT / "dashboard/public/exports/overlay"
overlay_samples = overlay_dir / "samples"
optim_dir = ROOT / "dashboard/public/exports/optimization"

for d in [wafer_samples, wafer_tfjs, yield_dir, overlay_samples, optim_dir]:
    ensure(d)

print("\n=== Wafer Defect Classifier ===")
wafer_export = ROOT / "projects/wafer-defect-classifier/export"
copy_if(wafer_export / "metrics.json", wafer_dir)
copy_if(wafer_export / "sample_manifest.json", wafer_dir)
for f in (wafer_export / "samples").glob("*.png"):
    shutil.copy2(f, wafer_samples)
    print(f"  [OK] {f.name}")
for f in (wafer_export / "tfjs_model").glob("*"):
    shutil.copy2(f, wafer_tfjs)
    print(f"  [OK] {f.name}")

print("\n=== Yield Prediction (SECOM) ===")
yield_export = ROOT / "projects/yield-prediction-secom/export"
copy_if(yield_export / "metrics.json", yield_dir)
copy_if(yield_export / "feature_importance.json", yield_dir)
copy_if(yield_export / "lookup_table.json", yield_dir)

print("\n=== Overlay Error Detection ===")
overlay_export = ROOT / "projects/overlay-error-detection/export"
copy_if(overlay_export / "results.json", overlay_dir)
for f in (overlay_export / "samples").glob("*.png"):
    shutil.copy2(f, overlay_samples)
    print(f"  [OK] {f.name}")

print("\n=== Process Optimization ===")
optim_export = ROOT / "projects/process-param-optimization/export"
copy_if(optim_export / "convergence.json", optim_dir)
copy_if(optim_export / "results.json", optim_dir)

print("\n=== Notes ===")
copy_if(ROOT / "notes/fab-floor-notes.md", ROOT / "dashboard/public/exports")

print("\n[DONE] Export files copied to dashboard/public/exports/")
