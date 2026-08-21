"""
Overlay Error Detection â€” Generate synthetic die pattern image pairs,
detect misalignment with OpenCV, compare against ground truth.

All data is SYNTHETIC by design â€” this is a simulation demo.
Ground truth is known, so detector accuracy is measurable.
"""

import json
import math
import numpy as np
import cv2
from pathlib import Path
from PIL import Image

BASE = Path(__file__).parent
EXPORT_DIR = BASE / "export"
SAMPLES_DIR = EXPORT_DIR / "samples"
EXPORT_DIR.mkdir(exist_ok=True)
SAMPLES_DIR.mkdir(exist_ok=True)

N_PAIRS = 50
N_SAVE = 10
IMG_SIZE = 256
GRID_PITCH = 32   # pixels per grid cell
SEED = 42

rng = np.random.RandomState(SEED)

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def make_base_pattern(size=IMG_SIZE, pitch=GRID_PITCH):
    """Generate a base layer: regular grid of squares."""
    img = np.ones((size, size), dtype=np.uint8) * 30  # dark background
    for y in range(pitch, size, pitch):
        for x in range(pitch, size, pitch):
            cv2.rectangle(img, (x - 8, y - 8), (x + 8, y + 8), 220, -1)
    # Add some corner markers for feature matching
    for (cx, cy) in [(40, 40), (size - 40, 40), (40, size - 40), (size - 40, size - 40)]:
        cv2.circle(img, (cx, cy), 12, 255, -1)
        cv2.circle(img, (cx, cy), 5, 30, -1)
    return img


def apply_misalignment(img, dx, dy, angle_deg):
    """Apply known misalignment: translate by (dx, dy) and rotate by angle_deg."""
    h, w = img.shape
    # Rotation around center
    M_rot = cv2.getRotationMatrix2D((w / 2, h / 2), angle_deg, 1.0)
    # Add translation to the rotation matrix
    M_rot[0, 2] += dx
    M_rot[1, 2] += dy
    shifted = cv2.warpAffine(img, M_rot, (w, h),
                             flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_CONSTANT,
                             borderValue=30)
    return shifted, M_rot


def detect_misalignment(base, shifted):
    """
    Detect translation + rotation misalignment using feature matching.
    Returns (dx_det, dy_det, angle_det).
    """
    # ORB feature detector
    orb = cv2.ORB_create(nfeatures=500)
    kp1, des1 = orb.detectAndCompute(base, None)
    kp2, des2 = orb.detectAndCompute(shifted, None)

    if des1 is None or des2 is None or len(kp1) < 4 or len(kp2) < 4:
        # Fallback: phase correlation for pure translation
        f1 = np.fft.fft2(base.astype(np.float32))
        f2 = np.fft.fft2(shifted.astype(np.float32))
        cross = f1 * np.conj(f2)
        cross /= (np.abs(cross) + 1e-8)
        corr = np.abs(np.fft.ifft2(cross))
        peak = np.unravel_index(np.argmax(corr), corr.shape)
        dy_det = float(peak[0]) if peak[0] < IMG_SIZE // 2 else float(peak[0] - IMG_SIZE)
        dx_det = float(peak[1]) if peak[1] < IMG_SIZE // 2 else float(peak[1] - IMG_SIZE)
        return dx_det, dy_det, 0.0

    # BFMatcher for ORB
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    if len(matches) < 4:
        return 0.0, 0.0, 0.0

    matches = sorted(matches, key=lambda m: m.distance)[:50]
    pts1 = np.float32([kp1[m.queryIdx].pt for m in matches])
    pts2 = np.float32([kp2[m.trainIdx].pt for m in matches])

    M, inliers = cv2.estimateAffinePartial2D(pts1, pts2, method=cv2.RANSAC, ransacReprojThreshold=3)
    if M is None:
        return 0.0, 0.0, 0.0

    dx_det = float(M[0, 2])
    dy_det = float(M[1, 2])
    angle_det = float(math.degrees(math.atan2(M[1, 0], M[0, 0])))
    return dx_det, dy_det, angle_det


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Generate 50 pairs
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

base_pattern = make_base_pattern()
results = []

print("[INFO] Generating 50 die pattern pairs and detecting misalignment...")

for i in range(N_PAIRS):
    # True misalignment: dx âˆˆ [-15,15], dy âˆˆ [-15,15], angle âˆˆ [-5,5] deg
    dx_true = float(rng.uniform(-15, 15))
    dy_true = float(rng.uniform(-15, 15))
    angle_true = float(rng.uniform(-5, 5))

    # Add slight noise to base pattern to simulate variation
    noise = rng.randint(0, 10, base_pattern.shape, dtype=np.uint8)
    base_noisy = cv2.add(base_pattern, noise)

    shifted, _ = apply_misalignment(base_noisy, dx_true, dy_true, angle_true)

    dx_det, dy_det, angle_det = detect_misalignment(base_noisy, shifted)

    err_dx = abs(dx_det - dx_true)
    err_dy = abs(dy_det - dy_true)
    err_angle = abs(angle_det - angle_true)

    results.append({
        "pair_id": i,
        "true_dx": round(dx_true, 3),
        "true_dy": round(dy_true, 3),
        "true_angle_deg": round(angle_true, 3),
        "detected_dx": round(dx_det, 3),
        "detected_dy": round(dy_det, 3),
        "detected_angle_deg": round(angle_det, 3),
        "error_dx": round(err_dx, 3),
        "error_dy": round(err_dy, 3),
        "error_angle_deg": round(err_angle, 3),
    })

    # Save first N_SAVE pairs as PNG
    if i < N_SAVE:
        base_rgb = cv2.cvtColor(base_noisy, cv2.COLOR_GRAY2BGR)
        shifted_rgb = cv2.cvtColor(shifted, cv2.COLOR_GRAY2BGR)

        # Annotate
        cv2.putText(base_rgb, "Base Layer", (5, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 100), 1)
        cv2.putText(shifted_rgb,
                    f"Shifted: dx={dx_true:.1f} dy={dy_true:.1f} a={angle_true:.1f}deg",
                    (5, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 255), 1)
        cv2.putText(shifted_rgb,
                    f"Detected: dx={dx_det:.1f} dy={dy_det:.1f} a={angle_det:.1f}deg",
                    (5, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 150, 0), 1)

        combined = np.hstack([base_rgb, shifted_rgb])
        fname = f"pair_{i:02d}.png"
        cv2.imwrite(str(SAMPLES_DIR / fname), combined)

    if (i + 1) % 10 == 0:
        print(f"  Processed {i+1}/{N_PAIRS} pairs...")

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Summary stats
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

mean_err_dx = np.mean([r["error_dx"] for r in results])
mean_err_dy = np.mean([r["error_dy"] for r in results])
mean_err_angle = np.mean([r["error_angle_deg"] for r in results])

print(f"\n[RESULT] Mean detection error:")
print(f"  Î”x: {mean_err_dx:.3f} px  |  Î”y: {mean_err_dy:.3f} px  |  Î”angle: {mean_err_angle:.3f} deg")

export_data = {
    "data_source": "SYNTHETIC",
    "data_source_note": "All image pairs are synthetically generated. Ground truth is known, so detector accuracy is real.",
    "n_pairs": N_PAIRS,
    "n_saved_samples": N_SAVE,
    "mean_error_dx_px": round(float(mean_err_dx), 3),
    "mean_error_dy_px": round(float(mean_err_dy), 3),
    "mean_error_angle_deg": round(float(mean_err_angle), 3),
    "detector_method": "ORB feature matching + RANSAC AffinePartial2D; fallback to phase correlation",
    "pairs": results,
}

with open(EXPORT_DIR / "results.json", "w") as f:
    json.dump(export_data, f, indent=2)

print(f"[SAVED] results.json ({N_PAIRS} pairs) to {EXPORT_DIR}")
print(f"[SAVED] {N_SAVE} example PNG pairs to {SAMPLES_DIR}")
print("\n[DONE] Overlay error detection complete.")

