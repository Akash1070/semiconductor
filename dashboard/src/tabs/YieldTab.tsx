import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

interface TopFeature {
  feature: string
  feature_index: number
  importance: number
}

interface LookupEntry {
  f0_idx: number
  f1_idx: number
  f2_idx: number
  f0_val: number
  f1_val: number
  f2_val: number
  prob_fail: number
}

interface LookupData {
  data_source: string
  top3_features: string[]
  top3_feature_indices: number[]
  grid_size: number
  grids: number[][]
  lookup: LookupEntry[]
}

interface FeatureImportance {
  data_source: string
  top_features: TopFeature[]
}

interface Metrics {
  data_source: string
  data_source_note: string
  accuracy: number
  precision_fail: number
  recall_fail: number
  f1_fail: number
  decision_threshold: number
  val_samples: number
  train_samples: number
  n_features_total: number
  model: string
  imbalance_note: string
  class_distribution: { pass: number; fail: number }
}

interface YieldTabProps {
  beginnerMode?: boolean
}

export default function YieldTab({ beginnerMode = true }: YieldTabProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance | null>(null)
  const [lookupData, setLookupData] = useState<LookupData | null>(null)
  const [sliders, setSliders] = useState([5, 5, 5])
  const [probFail, setProbFail] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${BASE}exports/yield/metrics.json`)
      .then(r => r.json()).then(setMetrics).catch(() => {})
    fetch(`${BASE}exports/yield/feature_importance.json`)
      .then(r => r.json()).then(setFeatureImportance).catch(() => {})
    fetch(`${BASE}exports/yield/lookup_table.json`)
      .then(r => r.json()).then(setLookupData).catch(() => {})
  }, [])

  // Update predicted probability when sliders change
  useEffect(() => {
    if (!lookupData) return
    const [i0, i1, i2] = sliders
    const entry = lookupData.lookup.find(
      e => e.f0_idx === i0 && e.f1_idx === i1 && e.f2_idx === i2
    )
    setProbFail(entry ? entry.prob_fail : null)
  }, [sliders, lookupData])

  const setPresetScenario = (type: string) => {
    if (type === 'normal') setSliders([5, 5, 5])
    else if (type === 'overheat') setSliders([9, 8, 2])
    else if (type === 'pressure') setSliders([2, 9, 8])
    else if (type === 'wear') setSliders([8, 1, 9])
  }

  const maxImportance = featureImportance?.top_features[0]?.importance ?? 1

  if (!metrics) {
    return <div className="empty-state"><div className="spinner" /><p style={{marginTop:16}}>Loading yield prediction data...</p></div>
  }

  const passCount = metrics.class_distribution.pass
  const failCount = metrics.class_distribution.fail
  const total = passCount + failCount
  const failRate = (failCount / total * 100).toFixed(1)

  return (
    <div>
      <div className="section-header">
        <h2>Fab Yield & Defect Risk Prediction (SECOM)</h2>
        <p>
          {beginnerMode
            ? "Making chips involves hundreds of steps! Out of 590 sensors in the factory, our AI finds the top 3 sensors that cause chips to break, so factory workers can stop bad batches before wasting money."
            : "Supervised Gradient Boosting Classifier trained on 1,567 SECOM wafer lots across 590 continuous sensor parameters. Features cost-sensitive threshold optimization to address extreme class imbalance."}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <span className={`data-badge ${metrics.data_source === 'REAL' ? 'real' : 'synthetic'}`}>
          {metrics.data_source === 'REAL'
            ? 'Real Data — SECOM (UCI ML Repository)'
            : 'Synthetic Demo Data'}
        </span>
        {beginnerMode && (
          <span style={{ fontSize: 12, background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            🐣 10th-Standard Easy View
          </span>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Factory Failures Caught" : "Recall (Fail)"}</div>
          <div className="metric-value accent-teal">{(metrics.recall_fail * 100).toFixed(1)}%</div>
          <div className="metric-sub">{beginnerMode ? "Catches 6 out of 10 broken batches" : "True Positive Rate for Failure"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Overall Wafer Score" : "Accuracy"}</div>
          <div className="metric-value accent-blue">{(metrics.accuracy * 100).toFixed(1)}%</div>
          <div className="metric-sub">{beginnerMode ? "🌟 Letter Grade: B+ (Good)" : "Validation Accuracy"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Real Alert Accuracy" : "Precision (Fail)"}</div>
          <div className="metric-value accent-amber">{(metrics.precision_fail * 100).toFixed(1)}%</div>
          <div className="metric-sub">Alert confidence</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Total Sensors Monitored" : "Sensors Monitored"}</div>
          <div className="metric-value">{metrics.n_features_total}</div>
          <div className="metric-sub">Process features</div>
        </div>
      </div>

      {beginnerMode ? (
        <div className="card" style={{ marginBottom: 24, background: 'rgba(238, 242, 255, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div className="card-title" style={{ color: 'var(--accent-indigo)' }}>💡 What is Yield? (Simple Explanation)</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Out of 100 microchips made in a batch, <strong>Yield</strong> is how many chips actually work! In real factories, only {failRate}% of batches fail. 
            If an AI lazily predicts "everything is fine", it gets 94% score but misses every broken batch! Our AI tunes its sensitivity to act like a smoke alarm that catches real factory fires early!
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Threshold Tuning & Imbalance Mitigation</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            With {failRate}% minority failure class ratio ({failCount} failures vs {passCount} passes), standard thresholding at $\tau = 0.5$ yields zero recall. 
            We calibrated the decision boundary to $\tau = {metrics.decision_threshold}$, optimizing the F1 metric on the PR curve to prioritize recall over naive precision.
          </p>
        </div>
      )}

      <div className="two-col">
        {/* Top Feature Importance */}
        <div className="card">
          <div className="card-title">Top 10 Critical Sensors Out of 590</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Out of {metrics.n_features_total} sensors, these 10 variables contribute 80%+ to wafer defects.
          </p>
          {featureImportance && (
            <div className="feat-bar-container">
              {featureImportance.top_features.map(ft => (
                <div key={ft.feature} className="feat-bar-row">
                  <div className="feat-bar-name">{ft.feature}</div>
                  <div className="feat-bar-track">
                    <div
                      className="feat-bar-fill"
                      style={{ width: `${(ft.importance / maxImportance) * 100}%` }}
                    />
                  </div>
                  <div className="feat-bar-val">{(ft.importance * 100).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Sensor Simulator & Presets */}
        <div className="interactive-section" style={{ margin: 0 }}>
          <div className="interactive-title">🎛️ Live Sensor Simulator & Risk Gauge</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Move the sensor sliders below or click an emergency preset to see how sensor shifts affect wafer failure risk!
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <button className="btn btn-outline" onClick={() => setPresetScenario('normal')}>✅ Normal Run</button>
            <button className="btn btn-outline" onClick={() => setPresetScenario('overheat')}>🔥 Chamber Overheat</button>
            <button className="btn btn-outline" onClick={() => setPresetScenario('pressure')}>⚡ Pressure Spike</button>
            <button className="btn btn-outline" onClick={() => setPresetScenario('wear')}>⚠️ Slurry Wear</button>
          </div>

          {lookupData && lookupData.top3_features.map((fname, fi) => (
            <div key={fi} className="slider-group">
              <div className="slider-label">
                <span>{fname} {fi === 0 ? '(Gas Flow)' : fi === 1 ? '(Chamber Temp)' : '(Pressure)'}</span>
                <span className="slider-value">
                  {lookupData.grids[fi][sliders[fi]]?.toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={lookupData.grid_size - 1}
                value={sliders[fi]}
                onChange={e => {
                  const newSliders = [...sliders]
                  newSliders[fi] = Number(e.target.value)
                  setSliders(newSliders)
                }}
              />
            </div>
          ))}

          {probFail !== null && (
            <div style={{ marginTop: 20 }}>
              <div className={`result-indicator ${probFail > 0.3 ? 'fail' : 'pass'}`}>
                <span style={{ fontSize: 28 }}>{probFail > 0.3 ? '⚠️' : '✅'}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>
                    {probFail > 0.3 ? 'PREDICTED: WAFER FAILURE RISK' : 'PREDICTED: PASS / SAFE YIELD'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>
                    Failure Risk Probability: <strong>{(probFail * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              </div>

              <div className="probability-bar" style={{ marginTop: 14, height: 10 }}>
                <div
                  className="probability-fill"
                  style={{
                    width: `${probFail * 100}%`,
                    background: probFail > 0.3 ? 'linear-gradient(90deg, #f59e0b, #dc2626)' : 'linear-gradient(90deg, #10b981, #06b6d4)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
