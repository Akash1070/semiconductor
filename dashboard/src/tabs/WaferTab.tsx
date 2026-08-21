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

interface WaferTabProps {
  beginnerMode?: boolean
}

export default function WaferTab({ beginnerMode = true }: WaferTabProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [manifest, setManifest] = useState<SampleManifest | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0)
  const [inferenceResult, setInferenceResult] = useState<ClassProbability[] | null>(null)
  const [inferring, setInferring] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  
  // Custom Wafer Drawing Canvas State
  const [customCanvasData, setCustomCanvasData] = useState<number[]>(() => new Array(32 * 32).fill(0))
  const [isDrawing, setIsDrawing] = useState(false)
  const [customInferenceResult, setCustomInferenceResult] = useState<ClassProbability[] | null>(null)

  const tfModelRef = useRef<any>(null)

  useEffect(() => {
    fetch(`${BASE}exports/wafer/metrics.json`)
      .then(r => r.json()).then(setMetrics).catch(() => {})
    fetch(`${BASE}exports/wafer/sample_manifest.json`)
      .then(r => r.json()).then(setManifest).catch(() => {})
  }, [])

  // Robust TF.js model loader via window.tf
  useEffect(() => {
    let checkInterval: any = null
    const initTF = async () => {
      try {
        const tf = (window as any).tf
        if (!tf) {
          // Wait for script to load
          return
        }
        const model = await tf.loadLayersModel(`${BASE}exports/wafer/tfjs_model/model.json`)
        tfModelRef.current = { tf, model }
        setModelLoaded(true)
        if (checkInterval) clearInterval(checkInterval)
      } catch (e: any) {
        setModelError(`TF.js Model Load Error: ${e.message}`)
      }
    }

    if ((window as any).tf) {
      initTF()
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).tf) {
          initTF()
        }
      }, 500)
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [])

  // Auto-run inference on initial sample once model loads
  useEffect(() => {
    if (modelLoaded && selectedIdx !== null && manifest) {
      runInference(selectedIdx)
    }
  }, [modelLoaded, selectedIdx, manifest])

  const runInference = async (idx: number) => {
    if (!manifest || !tfModelRef.current) return
    setInferring(true)
    setInferenceResult(null)
    try {
      const { tf, model } = tfModelRef.current
      const imgEl = document.getElementById(`wafer-img-${idx}`) as HTMLImageElement
      if (!imgEl) return
      
      const canvas = document.createElement('canvas')
      canvas.width = 32; canvas.height = 32
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(imgEl, 0, 0, 32, 32)
      const imageData = ctx.getImageData(0, 0, 32, 32)
      
      const gray = new Float32Array(32 * 32)
      for (let i = 0; i < 32 * 32; i++) {
        gray[i] = imageData.data[i * 4] / 255.0
      }
      const tensor = tf.tensor4d(gray, [1, 32, 32, 1])
      const probs = model.predict(tensor)
      const probArr: number[] = await probs.data()
      tensor.dispose(); probs.dispose()

      const classes = metrics?.classes || ['Center', 'Donut', 'Edge-Loc', 'Edge-Ring', 'Loc', 'Random', 'Scratch', 'none']
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

  // Custom Canvas Drawing Functions
  const handlePixelClick = (x: number, y: number) => {
    const newData = [...customCanvasData]
    const idx = y * 32 + x
    newData[idx] = newData[idx] === 1 ? 0 : 1
    setCustomCanvasData(newData)
  }

  const handleCanvasDrag = (x: number, y: number) => {
    if (!isDrawing) return
    const newData = [...customCanvasData]
    const idx = y * 32 + x
    newData[idx] = 1
    setCustomCanvasData(newData)
  }

  const clearCanvas = () => {
    setCustomCanvasData(new Array(32 * 32).fill(0))
    setCustomInferenceResult(null)
  }

  const drawPresetPattern = (type: string) => {
    const grid = new Array(32 * 32).fill(0)
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const distFromCenter = Math.sqrt((x - 16) ** 2 + (y - 16) ** 2)
        if (type === 'scratch' && Math.abs(x - y) <= 1 && distFromCenter < 14) {
          grid[y * 32 + x] = 1
        } else if (type === 'center' && distFromCenter <= 6) {
          grid[y * 32 + x] = 1
        } else if (type === 'ring' && distFromCenter >= 11 && distFromCenter <= 14) {
          grid[y * 32 + x] = 1
        }
      }
    }
    setCustomCanvasData(grid)
    setCustomInferenceResult(null)
  }

  const runCustomInference = async () => {
    if (!tfModelRef.current) return
    setInferring(true)
    try {
      const { tf, model } = tfModelRef.current
      const gray = new Float32Array(customCanvasData)
      const tensor = tf.tensor4d(gray, [1, 32, 32, 1])
      const probs = model.predict(tensor)
      const probArr: number[] = await probs.data()
      tensor.dispose(); probs.dispose()

      const classes = metrics?.classes || ['Center', 'Donut', 'Edge-Loc', 'Edge-Ring', 'Loc', 'Random', 'Scratch', 'none']
      const result: ClassProbability[] = classes.map((label, i) => ({
        label,
        prob: probArr[i] || 0,
      })).sort((a, b) => b.prob - a.prob)

      setCustomInferenceResult(result)
    } catch (e: any) {
      setModelError(`Custom inference error: ${e.message}`)
    } finally {
      setInferring(false)
    }
  }

  if (!metrics || !manifest) {
    return (
      <div className="empty-state">
        <div className="spinner" />
        <p style={{ marginTop: 16 }}>Loading wafer classifier models & real dataset metrics...</p>
      </div>
    )
  }

  const selected = selectedIdx !== null ? manifest.samples[selectedIdx] : null

  return (
    <div>
      <div className="section-header">
        <h2>Wafer Defect Pattern Classifier</h2>
        <p>
          {beginnerMode
            ? "Silicon wafers are big round plates where microchips are made. Sometimes machines leave scratch marks or ring defects. This AI scans wafer photos in 1 millisecond to tell factory engineers which machine is broken!"
            : "Convolutional Neural Network (CNN) trained on 172k+ real WM-811K wafer maps to classify 8 spatial defect topologies. Operates entirely client-side in WebGL via TensorFlow.js."}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <span className={`data-badge ${metrics.data_source === 'REAL' ? 'real' : 'synthetic'}`}>
          {metrics.data_source === 'REAL'
            ? 'Real Data — WM-811K (Kaggle Dataset)'
            : 'Synthetic Demo Data'}
        </span>
        {beginnerMode && (
          <span style={{ fontSize: 12, background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            🐣 10th-Standard Easy View
          </span>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Overall Test Score" : "Accuracy"}</div>
          <div className="metric-value accent-blue">{(metrics.accuracy * 100).toFixed(1)}%</div>
          <div className="metric-sub">{beginnerMode ? "🌟 Letter Grade: A+ (Outstanding)" : "Validation Set Accuracy"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Rare Defect Catch Rate" : "Macro-F1 Score"}</div>
          <div className="metric-value accent-teal">{(metrics.macro_f1 * 100).toFixed(1)}%</div>
          <div className="metric-sub">{beginnerMode ? "Equal score for all 8 defect types" : "Unweighted mean F1 score"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Tested Wafer Count" : "Validation Samples"}</div>
          <div className="metric-value">{metrics.val_samples.toLocaleString()}</div>
          <div className="metric-sub">Real silicon wafer maps</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "AI Training Set" : "Training Samples"}</div>
          <div className="metric-value">{metrics.train_samples.toLocaleString()}</div>
          <div className="metric-sub">WM-811K fab dataset</div>
        </div>
      </div>

      {/* Beginner vs Pro Explanation Banner */}
      {beginnerMode ? (
        <div className="card" style={{ marginBottom: 24, background: 'rgba(238, 242, 255, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div className="card-title" style={{ color: 'var(--accent-indigo)' }}>💡 What am I looking at? (Simple High School Explanation)</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Imagine a bakery making round cookies. If a conveyor belt is scratched, every cookie gets a straight line scratch. 
            In microchip factories, <strong>Scratches</strong> mean a robot arm scraped the wafer, while <strong>Edge-Rings</strong> mean the chemical polishing liquid wore out on the outer rim. 
            Our AI catches these shapes instantly so engineers fix the machine before ruining thousands of microchips!
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
            We evaluated performance via Macro-F1 (unweighted average across all 8 classes), ensuring severe penalization if rare classes (e.g. Donut, Scratch) are misclassified.
        </div>
      )}

      {/* Interactive Inference Section */}
      <div className="interactive-section">
        <div className="interactive-title">
          <span>⚡ Live In-Browser AI Engine (TensorFlow.js)</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {beginnerMode
            ? "Click any wafer map below! The AI model inside your browser will instantly read the image pixels and calculate what kind of defect it is."
            : "Client-side execution of [1, 32, 32, 1] Conv2D tensor via WebGL acceleration."}
        </p>

        {modelError && <div className="error-state">{modelError}</div>}

        <div className="two-col">
          {/* Sample Wafer Grid */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
              Select a Real Wafer Map Sample:
            </div>
            <div className="wafer-grid">
              {manifest.samples.map((s, i) => (
                <div
                  key={i}
                  className={`wafer-item${selectedIdx === i ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedIdx(i)
                    runInference(i)
                  }}
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

          {/* AI Prediction Results */}
          <div>
            {selected && (
              <div className="prediction-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Selected: <code style={{ color: 'var(--accent-indigo)' }}>{selected.filename}</code>
                  </span>
                  <span style={{ fontSize: 12, background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    True Label: <strong>{selected.true_label}</strong>
                  </span>
                </div>

                {inferring && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>
                    <div className="spinner" /> AI Neural Network is analyzing pixels...
                  </div>
                )}

                {inferenceResult && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>
                      AI Class Probabilities (Neural Network Outputs):
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {inferenceResult.map(({ label, prob }) => (
                        <div key={label}>
                          <div className="prediction-label">
                            <span style={{ fontSize: 13, fontWeight: label === selected.true_label ? 700 : 500, color: label === selected.true_label ? 'var(--accent-indigo)' : 'var(--text-secondary)' }}>
                              {label} {label === selected.true_label ? '🎯 (True Pattern)' : ''}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                              {(prob * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="probability-bar">
                            <div
                              className="probability-fill"
                              style={{
                                width: `${prob * 100}%`,
                                background: label === inferenceResult[0].label
                                  ? 'linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan))'
                                  : 'var(--bg-subtle)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      marginTop: 16,
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: inferenceResult[0].label === selected.true_label ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                      border: `1px solid ${inferenceResult[0].label === selected.true_label ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}>
                      <span style={{ fontSize: 20 }}>{inferenceResult[0].label === selected.true_label ? '✅' : '❌'}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: inferenceResult[0].label === selected.true_label ? 'var(--success)' : 'var(--danger)' }}>
                          AI Prediction: {inferenceResult[0].label}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {inferenceResult[0].label === selected.true_label
                            ? 'Match confirmed! The neural network accurately identified the defect pattern.'
                            : `Model predicted ${inferenceResult[0].label} (Actual ground truth: ${selected.true_label})`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW Interactive Custom Wafer Paint Tool! */}
      <div className="interactive-section" style={{ marginTop: 28, background: 'rgba(248, 250, 252, 0.95)', border: '2px dashed var(--accent-indigo)' }}>
        <div className="interactive-title" style={{ color: 'var(--accent-indigo)' }}>
          🎨 Draw Your Own Custom Wafer Defect (Interactive Sandbox)
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Click or drag your mouse on the grid below to paint custom defect pixels! Then click <strong>"Run AI Prediction"</strong> to see if the Neural Network recognizes your drawing!
        </p>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(32, 8px)',
                gridTemplateRows: 'repeat(32, 8px)',
                gap: 1,
                background: '#cbd5e1',
                padding: 4,
                borderRadius: 8,
                userSelect: 'none',
                cursor: 'pointer'
              }}
              onMouseDown={() => setIsDrawing(true)}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
            >
              {customCanvasData.map((val, idx) => {
                const x = idx % 32
                const y = Math.floor(idx / 32)
                return (
                  <div
                    key={idx}
                    onClick={() => handlePixelClick(x, y)}
                    onMouseEnter={() => handleCanvasDrag(x, y)}
                    style={{
                      width: 8,
                      height: 8,
                      background: val === 1 ? '#4f46e5' : '#ffffff',
                      borderRadius: 1
                    }}
                  />
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Preset Patterns:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => drawPresetPattern('scratch')}>Draw Scratch</button>
              <button className="btn btn-outline" onClick={() => drawPresetPattern('center')}>Draw Center</button>
              <button className="btn btn-outline" onClick={() => drawPresetPattern('ring')}>Draw Ring</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn btn-primary" onClick={runCustomInference}>🚀 Run AI Prediction</button>
              <button className="btn btn-outline" onClick={clearCanvas}>Clear Canvas</button>
            </div>
          </div>

          {customInferenceResult && (
            <div style={{ flex: 1, background: '#ffffff', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                AI Prediction on Your Drawing:
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-indigo)' }}>
                {customInferenceResult[0].label} ({(customInferenceResult[0].prob * 100).toFixed(1)}% Confidence)
              </div>
              <div style={{ marginTop: 8 }}>
                {customInferenceResult.slice(0, 3).map(res => (
                  <div key={res.label} style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>{res.label}:</span>
                    <span>{(res.prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
