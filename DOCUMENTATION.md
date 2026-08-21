# Semiconductor AI Portfolio — Complete System Documentation & Explainer Guide

> **Author**: Akash Kumar Jha  
> **Live Demo**: [https://akash1070.github.io/semiconductor/](https://akash1070.github.io/semiconductor/)  
> **Repository**: [https://github.com/Akash1070/semiconductor](https://github.com/Akash1070/semiconductor)  

---

## 🎯 Executive Summary

The **Semiconductor AI Portfolio** is a client-side analytics platform that applies Machine Learning and Computer Vision to semiconductor manufacturing (microchip fabrication). 

It demonstrates how AI can solve four multi-billion dollar problems in microchip fabs:
1. **Wafer Defect Pattern Classification**: Identifying machine failure signatures on silicon wafer maps using Convolutional Neural Networks (CNN).
2. **Fab Yield & Defect Risk Prediction**: Predicting wafer lot failures across 590 continuous sensor streams using Gradient Boosted Decision Trees.
3. **Photolithography Overlay Error Detection**: Measuring sub-micron layer alignment shifts using OpenCV computer vision keypoint matching.
4. **Process Parameter Optimization**: Finding optimal fab recipe settings (temperature, pressure, duration) using Bayesian Optimization with Gaussian Processes.

---

## 🏗️ Technical Architecture

```
                               ┌─────────────────────────────────────────┐
                               │       GitHub Pages (Static Hosting)     │
                               └────────────────────┬────────────────────┘
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │    Vite + React + TypeScript SPA        │
                               │   (Light Glassmorphism Design System)   │
                               └─────────┬──────────────────────┬────────┘
                                         │                      │
                   ┌─────────────────────▼───────┐      ┌───────▼─────────────────────┐
                   │ TensorFlow.js WebGL Engine   │      │ Precomputed Analytical      │
                   │ (Live In-Browser Inference) │      │ Lookup Tables & JSONs       │
                   └─────────────────────────────┘      └─────────────────────────────┘
```

- **Zero Server Overhead**: The entire system is built as a serverless Single Page Application (SPA).
- **Client-Side AI Inference**: The Wafer Defect Classifier runs a 32x32 CNN model **directly inside the user's browser** via TensorFlow.js (WebGL backend). No external API calls or server latencies.
- **Precomputed Lookup Engines**: The SECOM Yield Predictor and Bayesian Optimizer use multi-dimensional precomputed lookup matrices to render live slider adjustments instantaneously.

---

## 🔬 Detailed Module Breakdown

### 1. Wafer Defect Pattern Classifier (`WaferTab.tsx`)
- **Dataset**: **WM-811K** (172,000+ real wafer maps from real industrial fabs).
- **Model**: Custom 4-Layer Convolutional Neural Network (Conv2D -> BatchNorm -> MaxPool -> GlobalAveragePooling -> Softmax).
- **Performance**: **90.3% Test Accuracy** and **79.8% Macro-F1** across 8 defect topologies (`Center`, `Donut`, `Edge-Loc`, `Edge-Ring`, `Loc`, `Random`, `Scratch`, `none`).
- **Interactive Features**:
  - **Clickable Wafer Grid**: Click any real wafer map sample to run live TensorFlow.js pixel analysis.
  - **Custom Wafer Drawing Sandbox**: Draw custom defect patterns on an interactive 32x32 canvas and click *"Run AI Prediction"* to test model generalization.

### 2. Fab Yield Prediction (`YieldTab.tsx`)
- **Dataset**: **SECOM** (1,567 real wafer lots monitored across 590 continuous process sensors).
- **Model**: Cost-Sensitive Gradient Boosted Decision Trees (`XGBoost` / `HistGradientBoostingClassifier`).
- **Class Imbalance Handling**: Fab failures represent only ~6.6% of lots. Standard models fail by predicting 100% pass rate. We tuned decision thresholds ($\tau = 0.38$) to prioritize **Recall (Fail)** (~60% failure capture rate).
- **Interactive Features**:
  - **Fab Emergency Presets**: One-click buttons (`🔥 Chamber Overheat`, `⚡ Pressure Spike`, `⚠️ Slurry Wear`, `✅ Normal Run`) to simulate real factory equipment events.
  - **Sensor Sliders**: Live adjustments for top diagnostic sensors (Gas Flow, Chamber Temperature, Pressure).

### 3. Photolithography Overlay Error Detection (`OverlayTab.tsx`)
- **Problem**: Microchips consist of up to 80 stacked circuit layers. Layer misalignment ($> 1\,\mu\text{m}$) causes short circuits.
- **Pipeline**: OpenCV feature matching pipeline utilizing ORB (Oriented FAST and Rotated BRIEF) keypoints, Brute-Force Hamming distance matching, and RANSAC 2D partial affine transformation matrix estimation.
- **Performance**: Sub-pixel precision with Mean Absolute Error $< 0.4\,\text{px}$ in $x$ and $y$.
- **Interactive Features**:
  - **Pattern Pair Selector**: Switch between 10 die pairs with feature correspondence overlays.
  - **Interactive Layer Alignment Sandbox**: Manual $X$ and $Y$ translation sliders to test layer offset tolerance.

### 4. Process Parameter Optimization (`OptimizationTab.tsx`)
- **Method**: Bayesian Optimization using Gaussian Process surrogate modeling (`skopt.gp_minimize` with RBF kernel) and Expected Improvement (EI) acquisition function.
- **Goal**: Optimize non-linear yield surfaces governed by Temperature ($T$), Pressure ($P$), and Time ($t$).
- **Performance**: Reaches **98.3% Yield** in 32 iterations (compared to 1,000+ brute-force grid search steps).
- **Interactive Features**:
  - **Interactive Stepper**: Step through all trial runs with `[ ← Previous Step ]` and `[ Next Step → ]` to watch the AI navigate process parameters over time.

---

## 🗣️ How to Explain This Project in an Interview

### 💡 Simple Explanation (For Non-Technical / High Schoolers)
> "Making microchips is like baking the world's most complex cake with 80 layers. If the oven temperature changes by 1 degree, or if a robot arm scrapes the wafer, millions of dollars of chips get ruined. 
> 
> My project builds an AI system for chip factories. It scans wafer photos in 1 millisecond to find machine scratches, monitors 590 factory sensors to catch broken batches early, uses computer vision to align circuit layers perfectly, and acts like a master chef to find the optimal baking recipe in just 30 steps."

### ⚙️ Senior ML Engineer Explanation
> "I built an end-to-end, serverless semiconductor manufacturing intelligence platform deployed on GitHub Pages. The system addresses extreme class imbalance on the 172k-wafer WM-811K dataset using a Conv2D architecture evaluated on Macro-F1, and exports weight shards for zero-latency client-side WebGL inference via TensorFlow.js. 
> 
> For process yield monitoring, I applied cost-sensitive Gradient Boosting over 590 SECOM sensor variables, tuning decision boundaries to maximize failure recall under severe 14:1 imbalance. The computer vision layer implements RANSAC-filtered ORB keypoint matching for sub-micron overlay registration, and the recipe optimizer uses Gaussian Process Bayesian Optimization to solve non-convex yield surfaces in under 35 evaluations."

---

## 💻 How to Run Locally

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Akash1070/semiconductor.git
   cd semiconductor/dashboard
   npm install
   ```

2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

3. **Build & Verify**:
   ```bash
   npm run build
   ```

---

## 🚢 CI/CD Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically:
1. Installs dependencies and runs `npm run build`.
2. Copies pre-generated ML model artifacts into `dashboard/dist/exports/`.
3. Deploys the static build directly to the `gh-pages` branch.
