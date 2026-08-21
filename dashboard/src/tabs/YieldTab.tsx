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

export default function YieldTab() {
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
        <h2>Yield Prediction (SECOM)</h2>
        <p>
          Predicts pass/fail outcomes from semiconductor process sensor data.
          The SECOM dataset has 590 sensor readings per wafer lot cycle — but only a handful
          of sensors actually correlate with failures. This model learns which ones matter.
        </p>
      </div>

      <span className={`data-badge ${metrics.data_source === 'REAL' ? 'real' : 'synthetic'}`}>
        {metrics.data_source === 'REAL'
          ? 'Real Data — SECOM (UCI ML Repository)'
          : 'Synthetic Data — Generated Demo'}
      </span>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Accuracy</div>
          <div className="metric-value accent-blue">{(metrics.accuracy * 100).toFixed(1)}%</div>
          <div className="metric-sub">Overall val accuracy</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Recall (Fail)</div>
          <div className="metric-value accent-teal">{(metrics.recall_fail * 100).toFixed(1)}%</div>
          <div className="metric-sub">Failures caught</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Precision (Fail)</div>
          <div className="metric-value accent-amber">{(metrics.precision_fail * 100).toFixed(1)}%</div>
          <div className="metric-sub">Fail alerts that are real</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">F1 (Fail)</div>
          <div className="metric-value">{(metrics.f1_fail * 100).toFixed(1)}%</div>
          <div className="metric-sub">Harmonic mean of P/R</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Why These Numbers Look This Way</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          SECOM has {failRate}% failure rate ({failCount} fails, {passCount} passes — {total} total).
          A naïve classifier would predict "always pass" and get ~94% accuracy while catching 0% of failures.
          This model uses class-weighted training and threshold tuning (threshold={metrics.decision_threshold}) 
          to trade some accuracy for real failure detection. 
          The tradeoff is intentional: in a fab, missing a real failure is more costly than a false alarm.
        </p>
        {metrics.imbalance_note && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
            {metrics.imbalance_note}
          </p>
        )}
      </div>

      <div className="two-col">
        {/* Feature importances */}
        <div className="card">
          <div className="card-title">Top 10 Feature Importances</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Out of {metrics.n_features_total} total sensors, these are the most predictive.
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

        {/* Interactive sliders */}
        <div className="interactive-section" style={{ margin: 0 }}>
          <div className="interactive-title">Live Yield Prediction</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            Adjust the top 3 sensor values. The predicted fail probability updates via
            a precomputed lookup table (no server required).
          </p>

          {lookupData && lookupData.top3_features.map((fname, fi) => (
            <div key={fi} className="slider-group">
              <div className="slider-label">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fname}</span>
                <span className="slider-value">
                  {lookupData.grids[fi][sliders[fi]]?.toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                id={`slider-${fi}`}
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
              <div className={`result-indicator ${probFail > 0.5 ? 'fail' : 'pass'}`}>
                <span style={{ fontSize: 24 }}>{probFail > 0.5 ? '⚠' : '✓'}</span>
                <div>
                  <div>{probFail > 0.5 ? 'Predicted: FAIL' : 'Predicted: PASS'}</div>
                  <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>
                    Fail probability: {(probFail * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="probability-bar" style={{ marginTop: 12, height: 8 }}>
                <div className="probability-fill" style={{ width: `${probFail * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        Model: {metrics.model} · {metrics.data_source_note}
      </div>
    </div>
  )
}
