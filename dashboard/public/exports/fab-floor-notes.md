# Fab Floor Notes — Semiconductor Manufacturing Process
## A Plain-Language Reference

*These notes summarize key concepts in semiconductor fabrication relevant to the four portfolio projects. They are written for a technical-but-not-fab-specialist audience.*

---

## 1. Wafer Fabrication Overview

A silicon wafer starts as a 300mm (12-inch) disc of ultrapure silicon. Over ~3 months and 500+ process steps, it becomes thousands of integrated circuits. The yield — the fraction of chips that pass final test — is the single most important economic metric in the fab.

**Key stages:**
- **Wafer preparation** — Czochralski growth, slicing, polishing
- **Deposition** — adding thin films (oxide, nitride, metal) via CVD or PVD
- **Lithography** — printing circuit patterns using UV or EUV light
- **Etch** — removing material in patterned regions (dry plasma or wet chemical)
- **CMP** — Chemical Mechanical Planarization; polishing the wafer flat after each stack
- **Doping/Ion Implantation** — adding dopants to create transistor junctions
- **Inspection** — optical and e-beam inspection at every critical layer

---

## 2. Wafer Defect Maps (Project 1 context)

After each process step, optical inspection tools scan the wafer surface and generate a **wafer map** — a 2D grid recording where defects were found. Defect *patterns* matter as much as defect *counts*:

| Pattern | Likely cause |
|---------|-------------|
| **Center** | Process non-uniformity at wafer center (e.g., CMP over-polish) |
| **Donut** | Edge bead removal issue, or non-uniform plasma in etch |
| **Edge-Loc** | Localized edge damage (handling, carrier edge) |
| **Edge-Ring** | Systematic edge effect — often uniform across wafers in a lot |
| **Loc** | Localized particle or scratch |
| **Random** | Random particle contamination (environment or process) |
| **Scratch** | Physical handling damage; often shows as a line |
| **None** | No defect cluster — wafer passes inspection |

The WM-811K dataset (used in Project 1) contains ~811,000 wafer maps from real fabs, labeled by engineers — hence the heavy class imbalance toward "none" (~70%). That's realistic: most wafers pass.

**Why macro-F1 is lower than accuracy:** When "none" is 70% of the data, a classifier that gets "none" right but struggles on rare classes (like "Donut" or "Scratch") will have high accuracy but low macro-F1. Macro-F1 averages across classes equally — it punishes you for ignoring the rare ones.

---

## 3. Yield Prediction (Project 2 context)

**Yield** = (passing dice / total dice) × 100%.

The SECOM dataset captures 590 sensor readings per wafer lot cycle — temperatures, gas flows, RF power, chamber pressures — plus a pass/fail label from final electrical test. The problem structure is:
- **Most features are noise** — only ~10–20 of 590 sensors actually correlate with yield
- **Imbalanced labels** — failures are rare (~6–10% in SECOM)
- **Missing data** — sensors drop out; handling NaN is not optional

**Why gradient boosting here:** Tree-based models handle mixed-scale features, missing data (after imputation), and imbalance better than a raw neural network on tabular data of this size. Feature importances are also interpretable — you can tell a process engineer "this chamber pressure sensor is the top predictor."

**Precision vs Recall tradeoff:** High recall for fails (catch all real failures) = fewer yield losses but more unnecessary holds/retests. High precision = fewer false alarms but some real failures slip through. The right balance depends on the cost of missing a failure vs the cost of a false hold.

---

## 4. Overlay Error (Project 3 context)

**Overlay** is the alignment accuracy between two lithography layers. In modern logic (sub-5nm nodes), overlay specs are in the single-digit nanometer range.

When two masks are exposed on a wafer, any misalignment in x, y, or rotation causes transistors to form at the wrong relative positions — degrading leakage, drive current, or worst case, breaking the circuit entirely.

**How detection works here:** The project generates synthetic "die patterns" (simplified grids) and applies known misalignment. OpenCV's ORB feature detector finds corresponding points between layers, RANSAC filters outliers, and `estimateAffinePartial2D` recovers the misalignment transform. The "detector accuracy" is then compared to ground truth — the real number to report in an interview.

*In a real fab,* overlay is measured by dedicated metrology tools (e.g., KLA ARCHER) using special overlay targets printed alongside device patterns, not feature matching on circuit images.

---

## 5. Process Parameter Optimization (Project 4 context)

Every process step has a "recipe" — a set of controllable parameters (temperature, pressure, gas ratios, time, RF power). Finding the combination that maximizes yield is a high-dimensional search problem.

**The real challenge:** Fab experiments are expensive (~$1K–$10K per wafer lot). You can't run 10,000 random trials. That's why **Bayesian optimization** is well-suited: it builds a probabilistic model of the yield function and selects next experiments to maximize information gain (exploration) while exploiting currently known good regions.

Project 4 uses a synthetic yield function with a known optimum — it demonstrates the convergence behavior of Bayesian optimization vs random search, which is the correct thing to show. Applying this to a real recipe space requires real experimental data from a fab.

---

## 6. Terminology Glossary

| Term | Definition |
|------|-----------|
| **Die** | A single chip site on a wafer |
| **Lot** | A batch of wafers processed together (usually 25 wafers) |
| **CMP** | Chemical Mechanical Planarization — wafer polishing step |
| **Etch** | Selective removal of material |
| **CVD** | Chemical Vapor Deposition — thin film growth |
| **OPC** | Optical Proximity Correction — pre-distorting mask shapes to compensate for diffraction |
| **EUV** | Extreme Ultraviolet lithography — 13.5nm wavelength, used at 5nm node and below |
| **SPC** | Statistical Process Control — monitoring process parameters over time |
| **FMEA** | Failure Mode and Effects Analysis — systematic risk assessment |
| **E-beam** | Electron beam inspection — higher resolution than optical, used for critical layers |

---

*Last updated: August 2026. These notes are for educational reference and interview preparation, not production process guidance.*
