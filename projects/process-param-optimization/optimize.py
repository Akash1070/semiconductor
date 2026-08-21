"""
Process Parameter Optimization — Bayesian Optimization Demo
Optimizes a synthetic yield function over (temperature, pressure, time).

THIS IS A SIMULATION: The yield function is artificially defined with a known
optimum. This is NOT a validated model of any real fabrication process.
Labeled as SYNTHETIC/SIMULATION throughout.
"""

import json
import numpy as np
from pathlib import Path

BASE = Path(__file__).parent
EXPORT_DIR = BASE / "export"
EXPORT_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────
# Synthetic yield function
# Known optimum: temp=350°C, pressure=5.2 Torr, time=120s
# ─────────────────────────────────────────

TRUE_OPTIMUM = {"temperature": 350.0, "pressure": 5.2, "time": 120.0}
TRUE_MAX_YIELD = 0.95

BOUNDS = {
    "temperature": (280.0, 420.0),  # °C
    "pressure": (2.0, 9.0),          # Torr
    "time": (60.0, 200.0),           # seconds
}

NOISE_STD = 0.02   # process noise


def yield_function(temp, pressure, time, noise=True):
    """
    Synthetic yield function: 3D Gaussian + interaction term, with noise.
    Returns a value in [0, ~0.95].
    SIMULATION ONLY — not based on real fab data.
    """
    # Normalized distance from optimum
    dt = (temp - TRUE_OPTIMUM["temperature"]) / 40.0
    dp = (pressure - TRUE_OPTIMUM["pressure"]) / 2.0
    dtime = (time - TRUE_OPTIMUM["time"]) / 30.0

    # Gaussian decay + mild interaction penalty
    base = TRUE_MAX_YIELD * np.exp(-0.5 * (dt**2 + dp**2 + dtime**2))
    # Interaction: high temp + high pressure degrades yield
    interaction = -0.05 * max(0, dt) * max(0, dp)
    result = float(np.clip(base + interaction, 0.0, 1.0))

    if noise:
        result = float(np.clip(result + np.random.normal(0, NOISE_STD), 0.0, 1.0))
    return result


# ─────────────────────────────────────────
# Bayesian Optimization using scikit-optimize
# ─────────────────────────────────────────

try:
    from skopt import gp_minimize
    from skopt.space import Real
    USE_BAYESIAN = True
    print("[INFO] scikit-optimize found — using Bayesian optimization (gp_minimize).")
except ImportError:
    USE_BAYESIAN = False
    print("[WARNING] scikit-optimize not found — falling back to random search.")

N_ITERATIONS = 100
convergence = []   # (iteration, best_yield_so_far)
all_evaluations = []

np.random.seed(42)

if USE_BAYESIAN:
    space = [
        Real(*BOUNDS["temperature"], name="temperature"),
        Real(*BOUNDS["pressure"], name="pressure"),
        Real(*BOUNDS["time"], name="time"),
    ]

    call_count = [0]
    best_so_far = [0.0]

    def objective(params):
        temp, pressure, time = params
        y = yield_function(temp, pressure, time)
        call_count[0] += 1
        if y > best_so_far[0]:
            best_so_far[0] = y
        convergence.append({
            "iteration": call_count[0],
            "yield": round(y, 4),
            "best_yield_so_far": round(best_so_far[0], 4),
            "temperature": round(temp, 2),
            "pressure": round(pressure, 3),
            "time": round(time, 2),
        })
        all_evaluations.append(params + [y])
        return -y  # minimize negative yield

    print(f"[INFO] Running Bayesian optimization for {N_ITERATIONS} iterations...")
    result = gp_minimize(
        objective,
        space,
        n_calls=N_ITERATIONS,
        n_initial_points=10,
        random_state=42,
        verbose=False,
    )

    best_params = {
        "temperature": round(float(result.x[0]), 2),
        "pressure": round(float(result.x[1]), 3),
        "time": round(float(result.x[2]), 2),
    }
    best_yield = round(-float(result.fun), 4)
    method = "Bayesian Optimization (scikit-optimize gp_minimize, RBF kernel)"

else:
    # Random search fallback
    print(f"[INFO] Running random search for {N_ITERATIONS} iterations...")
    best_yield = 0.0
    best_params = {}

    for i in range(N_ITERATIONS):
        temp = np.random.uniform(*BOUNDS["temperature"])
        pressure = np.random.uniform(*BOUNDS["pressure"])
        time = np.random.uniform(*BOUNDS["time"])
        y = yield_function(temp, pressure, time)

        if y > best_yield:
            best_yield = y
            best_params = {
                "temperature": round(float(temp), 2),
                "pressure": round(float(pressure), 3),
                "time": round(float(time), 2),
            }
        convergence.append({
            "iteration": i + 1,
            "yield": round(float(y), 4),
            "best_yield_so_far": round(float(best_yield), 4),
            "temperature": round(float(temp), 2),
            "pressure": round(float(pressure), 3),
            "time": round(float(time), 2),
        })

    best_yield = round(float(best_yield), 4)
    method = "Random Search"

# ─────────────────────────────────────────
# Results
# ─────────────────────────────────────────

true_yield_at_optimum = yield_function(
    TRUE_OPTIMUM["temperature"], TRUE_OPTIMUM["pressure"], TRUE_OPTIMUM["time"], noise=False
)

print(f"\n[RESULT]")
print(f"  Method: {method}")
print(f"  Best found yield: {best_yield:.4f}")
print(f"  Best found params: {best_params}")
print(f"  True optimum: {TRUE_OPTIMUM}")
print(f"  True max yield (no noise): {true_yield_at_optimum:.4f}")

results_data = {
    "data_source": "SYNTHETIC",
    "data_source_note": (
        "This is a simulation with an artificially defined yield function. "
        "The 'optimum' is known by construction, not from real fab data."
    ),
    "method": method,
    "n_iterations": N_ITERATIONS,
    "best_found_yield": float(best_yield),
    "best_found_params": best_params,
    "true_optimum_params": TRUE_OPTIMUM,
    "true_max_yield_no_noise": round(float(true_yield_at_optimum), 4),
    "yield_gap": round(float(true_yield_at_optimum - best_yield), 4),
    "bounds": BOUNDS,
}

conv_data = {
    "data_source": "SYNTHETIC",
    "method": method,
    "iterations": convergence,
}

with open(EXPORT_DIR / "results.json", "w") as f:
    json.dump(results_data, f, indent=2)

with open(EXPORT_DIR / "convergence.json", "w") as f:
    json.dump(conv_data, f, indent=2)

print(f"[SAVED] results.json and convergence.json to {EXPORT_DIR}")
print("\n[DONE] Process parameter optimization complete.")
