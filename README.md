# Semiconductor AI Portfolio

A set of applied machine learning projects exploring how AI, computer vision, and process data can help predict defects and improve yield in semiconductor manufacturing — built as hands-on research preparation ahead of graduate study in semiconductor engineering.

**Live dashboard:** [https://akash1070.github.io/semiconductor/](https://akash1070.github.io/semiconductor/)

---

## What's in this repo

| Project | What it does | Data used |
|---------|-------------|-----------|
| [wafer-defect-classifier](projects/wafer-defect-classifier/) | Classifies wafer map defect patterns (Center, Donut, Scratch, etc.) using a CNN | WM-811K (real fab data, Kaggle) — synthetic fallback if unavailable |
| [yield-prediction-secom](projects/yield-prediction-secom/) | Predicts pass/fail yield outcomes from process sensor data | SECOM (real fab data, UCI ML Repository) — synthetic fallback if unavailable |
| [overlay-error-detection](projects/overlay-error-detection/) | Detects photolithography layer misalignment in die pattern images | Synthetic (generated in-repo, ground truth is known) |
| [process-param-optimization](projects/process-param-optimization/) | Toy simulation optimizing process parameters (e.g. temperature, pressure) to maximize simulated yield | Synthetic (explicitly a simplified proof of concept, not a real fab model) |
| [dashboard](dashboard/) | Static site presenting all four projects with live, in-browser interactive demos | Pulls results from each project's `/export` folder |
| [notes/fab-floor-notes.md](notes/fab-floor-notes.md) | Plain-language notes on the semiconductor fabrication process | — |

---

## A note on data honesty

Two projects (wafer-defect-classifier, yield-prediction-secom) are built to run on real, published fab datasets. If those datasets aren't present locally, they fall back to generating synthetic data with a similar structure — **this is clearly labeled everywhere it appears** (README, exported metrics.json, dashboard) and should never be read as real fab results. The other two projects are simulations by design and are labeled as such throughout.

The dashboard reads directly from each project's `export/` folder — the numbers shown are whatever the scripts actually produced, not hardcoded targets.

---

## Repo structure

```
semiconductor-ai-portfolio/
├── projects/
│   ├── wafer-defect-classifier/
│   │   ├── data/              (you add: LSWMD.pkl from Kaggle)
│   │   ├── data_prep.py       (loads real data or generates synthetic)
│   │   ├── train.py           (CNN training + TF.js export)
│   │   ├── export/            (generated: tfjs_model/, metrics.json, samples/)
│   │   └── requirements.txt
│   ├── yield-prediction-secom/
│   │   ├── data/              (you add: secom.data, secom_labels.data)
│   │   ├── train.py           (GradientBoosting + lookup table export)
│   │   ├── export/            (generated: metrics.json, feature_importance.json, lookup_table.json)
│   │   └── requirements.txt
│   ├── overlay-error-detection/
│   │   ├── generate_and_detect.py  (generates pairs + runs OpenCV detection)
│   │   ├── export/                 (generated: results.json, samples/)
│   │   └── requirements.txt
│   └── process-param-optimization/
│       ├── optimize.py        (Bayesian opt or random search)
│       ├── export/            (generated: convergence.json, results.json)
│       └── requirements.txt
├── dashboard/                 (Vite + React static site)
│   └── public/exports/        (copies of export files for the dashboard)
├── notes/
│   └── fab-floor-notes.md
├── .github/workflows/
│   └── deploy.yml             (GitHub Actions: build + deploy to gh-pages)
└── README.md
```

---

## Getting the data

### SECOM (no account needed)

```bash
mkdir -p projects/yield-prediction-secom/data
curl -o projects/yield-prediction-secom/data/secom.data \
  http://archive.ics.uci.edu/ml/machine-learning-databases/secom/secom.data
curl -o projects/yield-prediction-secom/data/secom_labels.data \
  http://archive.ics.uci.edu/ml/machine-learning-databases/secom/secom_labels.data
```

### WM-811K (free Kaggle account required)

1. Create/log in to a Kaggle account
2. Go to [kaggle.com/datasets/qingyi/wm811k-wafer-map](https://www.kaggle.com/datasets/qingyi/wm811k-wafer-map) and download
3. Place `LSWMD.pkl` into `projects/wafer-defect-classifier/data/`

**Optional CLI method:**
```bash
pip install kaggle
# place your kaggle.json API token at ~/.kaggle/kaggle.json first
kaggle datasets download -d qingyi/wm811k-wafer-map
```

If you skip data download entirely, each project still runs — it will auto-generate labeled synthetic data instead so the pipeline isn't blocked.

---

## Running a project

Each project folder is self-contained. General pattern:

```bash
cd projects/<project-name>
pip install -r requirements.txt

# Wafer classifier (run data_prep first):
python data_prep.py
python train.py

# All others:
python train.py        # yield prediction
python generate_and_detect.py   # overlay detection
python optimize.py     # process optimization
```

Each run writes outputs to that project's `export/` folder.

---

## Running the dashboard locally

```bash
cd dashboard
npm install
npm run dev
```

The dashboard is a static site — once built, it needs no backend. It is deployed automatically to GitHub Pages on every push to `main` via GitHub Actions.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Modeling | Python, TensorFlow/Keras, scikit-learn, OpenCV, scikit-optimize |
| In-browser inference | TensorFlow.js (wafer classifier runs entirely client-side) |
| Dashboard | Vite + React, TypeScript |
| CI/CD | GitHub Actions → GitHub Pages |

---

## Honest scope notes

- Model performance numbers are whatever the last run actually produced — check `export/metrics.json` in each project folder for current results.
- The WM-811K classifier is a small model trained for a short cycle, meant to demonstrate the approach — not to match published state-of-the-art.
- `process-param-optimization` is a simplified simulation with a known synthetic objective function. It demonstrates the concept, not a validated model of any real fab process.

---

## Author

**Akash Kumar Jha**
