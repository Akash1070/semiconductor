import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.BASE_URL

interface SampleItem {
  filename: string
  true_label: string
  pred_label: string
  pred_prob: number
}

interface SampleManifest {
  samples: SampleItem[]
  data_source: string
}

interface Metrics {
  data_source: string
  data_source_note: string
  accuracy: number
  macro_f1: number
  val_samples: number
  train_samples: number
  classes: string[]
  per_class_report: Record<string, { precision: number; recall: number; 'f1-score': number; support: number }>
  model_architecture: string
}

interface ClassProbability {
  label: string
  prob: number
}

export default function WaferTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [manifest, setManifest] = useState<SampleManifest | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [inferenceResult, setInferenceResult] = useState<ClassProbability[] | null>(null)
  const [inferring, setInferring] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const tfModelRef = useRef<any>(null)

  useEffect(() => {
    fetch(`${BASE}exports/wafer/metrics.json`)
      .then(r => r.json()).then(setMetrics).catch(() => {})
    fetch(`${BASE}exports/wafer/sample_manifest.json`)
      .then(r => r.json()).then(setManifest).catch(() => {})
  }, [])

  // Load TF.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        // @ts-ignore
        const tf = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js')
        const model = await tf.loadLayersModel(`${BASE}exports/wafer/tfjs_model/model.json`)
        tfModelRef.current = { tf, model }
        setModelLoaded(true)
      } catch (e: any) {
        setModelError(`Model load failed: ${e.message}. Check that tfjs_model/ is in public/exports/wafer/.`)
      }
    }
    loadModel()
  }, [])

  const runInference = async (idx: number) => {
    if (!manifest || !tfModelRef.current) return
    setInferring(true)
    setInferenceResult(null)
    try {
      const { tf, model } = tfModelRef.current
      const imgEl = document.getElementById(`wafer-img-${idx}`) as HTMLImageElement
      const canvas = document.createElement('canvas')
      canvas.width = 32; canvas.height = 32
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(imgEl, 0, 0, 32, 32)
      const imageData = ctx.getImageData(0, 0, 32, 32)
      // Convert to grayscale float tensor [1, 32, 32, 1]
      const gray = new Float32Array(32 * 32)
      for (let i = 0; i < 32 * 32; i++) {
        gray[i] = imageData.data[i * 4] / 255.0
      }
      const tensor = tf.tensor4d(gray, [1, 32, 32, 1])
      const probs = model.predict(tensor)
      const probArr: number[] = await probs.data()
      tensor.dispose(); probs.dispose()

      const classes = metrics?.classes || []
      const result: ClassProbability[] = classes.map((label, i) => ({
        label,
        prob: probArr[i] || 0,
      })).sort((a, b) => b.prob - a.prob)
      setInferenceResult(result)
    } catch (e: any) {
      setModelError(`Inference error: ${e.message}`)
    } finally {
      setInferring(false)
    }
  }

  const handleSelectSample = (idx: number) => {
    setSelectedIdx(idx)
    setInferenceResult(null)
    if (modelLoaded) runInference(idx)
  }

  if (!metrics || !manifest) {
    return <div className="empty-state"><div className="spinner" /><p style={{marginTop:16}}>Loading wafer classifier data...</p></div>
  }

  const selected = selectedIdx !== null ? manifest.samples[selectedIdx] : null

  return (
    <div>
      <div className="section-header">
        <h2>Wafer Defect Classifier</h2>
        <p>
          A convolutional neural network that classifies 32×32 wafer map images into 8 defect patterns.
          These patterns — Center, Donut, Scratch, Edge-Ring, and others — tell process engineers
          which manufacturing step is causing problems and where on the wafer.
        </p>
      </div>

      <span className={`data-badge ${metrics.data_source === 'REAL' ? 'real' : 'synthetic'}`}>
        {metrics.data_source === 'REAL'
          ? 'Real Data — WM-811K (Kaggle)'
          : 'Synthetic Data — Generated Demo'}
      </span>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Accuracy</div>
          <div className="metric-value accent-blue">{(metrics.accuracy * 100).toFixed(1)}%</div>
          <div className="metric-sub">Validation set</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Macro-F1</div>
          <div className="metric-value accent-teal">{(metrics.macro_f1 * 100).toFixed(1)}%</div>
          <div className="metric-sub">Averaged across all 8 classes equally</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Val Samples</div>
          <div className="metric-value">{metrics.val_samples.toLocaleString()}</div>
          <div className="metric-sub">Held-out test set</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Train Samples</div>
          <div className="metric-value">{metrics.train_samples.toLocaleString()}</div>
          <div className="metric-sub">Training set</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Why Macro-F1 &lt; Accuracy</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          About 70% of real wafer maps are labeled "none" (no defect cluster). A classifier that
          correctly identifies "none" every time would score ~70% accuracy — but macro-F1 averages
          the F1 score equally across all 8 classes. Rare patterns like Donut or Scratch drag the
          macro-F1 down. That's why macro-F1 is the right metric here: it penalizes ignoring rare
          but important defect types. Class-weighted training was used to help with this.
        </p>
      </div>

      {/* Per-class report */}
      {metrics.per_class_report && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Per-Class Performance</div>
          <table className="class-report">
            <thead>
              <tr>
                <th>Class</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1</th>
                <th>Support</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.per_class_report).map(([cls, v]) => (
                <tr key={cls}>
                  <td>{cls}</td>
                  <td>{(v.precision * 100).toFixed(1)}%</td>
                  <td>{(v.recall * 100).toFixed(1)}%</td>
                  <td>{(v['f1-score'] * 100).toFixed(1)}%</td>
                  <td>{v.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive inference */}
      <div className="interactive-section">
        <div className="interactive-title">Live In-Browser Inference (TensorFlow.js)</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          The model runs entirely in your browser — no server involved. Select a sample wafer map
          to see the CNN's prediction vs the true label.
        </p>

        {modelError && <div className="error-state">{modelError}</div>}
        {!modelLoaded && !modelError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--text-muted)', fontSize: 13 }}>
            <div className="spinner" /> Loading TF.js model...
          </div>
        )}
        {modelLoaded && (
          <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 16 }}>
            ✓ Model loaded — click a sample to run inference
          </div>
        )}

        <div className="two-col">
          <div>
            <div className="wafer-grid">
              {manifest.samples.map((s, i) => (
                <div
                  key={i}
                  className={`wafer-item${selectedIdx === i ? ' selected' : ''}`}
                  onClick={() => handleSelectSample(i)}
                  title={`True: ${s.true_label}`}
                >
                  <img
                    id={`wafer-img-${i}`}
                    src={`${BASE}exports/wafer/samples/${s.filename}`}
                    alt={`Wafer map: ${s.true_label}`}
                    crossOrigin="anonymous"
                  />
                  <div className="wafer-label">{s.true_label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {selected && (
              <div>
                <div style={{ marginBottom: 16, fontSize: 13 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Selected:</strong>{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    {selected.filename}
                  </span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span className="metric-label">True label: </span>
                  <strong style={{ color: 'var(--accent-teal)' }}>{selected.true_label}</strong>
                </div>
                {inferring && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                    <div className="spinner" /> Running inference...
                  </div>
                )}
                {inferenceResult && (
                  <div className="prediction-box">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Class probabilities (CNN output):
                    </div>
                    {inferenceResult.map(({ label, prob }) => (
                      <div key={label}>
                        <div className="prediction-label">
                          <span style={{ fontSize: 12, color: label === selected.true_label ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                            {label}{label === selected.true_label ? ' ✓' : ''}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                            {(prob * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="probability-bar">
                          <div className="probability-fill" style={{ width: `${prob * 100}%` }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Model predicts: </span>
                      <strong style={{ color: inferenceResult[0].label === selected.true_label ? 'var(--success)' : 'var(--danger)' }}>
                        {inferenceResult[0].label}
                      </strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                        {inferenceResult[0].label === selected.true_label ? '(Correct ✓)' : `(Incorrect — true: ${selected.true_label})`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!selected && (
              <div className="empty-state">
                ← Select a wafer map to run inference
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        Model: {metrics.model_architecture} · {metrics.data_source_note}
      </div>
    </div>
  )
}
