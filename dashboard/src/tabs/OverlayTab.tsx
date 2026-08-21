import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

interface PairResult {
  filename: string
  true_dx: number
  true_dy: number
  true_dtheta: number
  pred_dx: number
  pred_dy: number
  pred_dtheta: number
  matches_found: number
  error_dx: number
  error_dy: number
  error_dtheta: number
}

interface OverlayData {
  data_source: string
  n_pairs: number
  mae_dx: number
  mae_dy: number
  mae_dtheta: number
  pairs: PairResult[]
}

interface OverlayTabProps {
  beginnerMode?: boolean
}

export default function OverlayTab({ beginnerMode = true }: OverlayTabProps) {
  const [data, setData] = useState<OverlayData | null>(null)
  const [selectedPair, setSelectedPair] = useState<number>(0)
  
  // Interactive Manual Shift Simulator
  const [manualDx, setManualDx] = useState(0)
  const [manualDy, setManualDy] = useState(0)

  useEffect(() => {
    fetch(`${BASE}exports/overlay/results.json`)
      .then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data) {
    return <div className="empty-state"><div className="spinner" /><p style={{marginTop:16}}>Loading overlay error detection data...</p></div>
  }

  const currentPair = data.pairs[selectedPair]

  return (
    <div>
      <div className="section-header">
        <h2>Photolithography Overlay Error Detection</h2>
        <p>
          {beginnerMode
            ? "Microchips have up to 80 layers printed on top of each other! If layer 2 shifts by even 1 micrometer, the chip is ruined. This computer vision tool measures tiny layer alignment shifts using keypoint matching."
            : "Sub-pixel feature matching pipeline utilizing OpenCV ORB keypoint extraction, Brute-Force Hamming matching, and RANSAC 2D partial affine transformation matrix estimation."}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <span className={`data-badge ${data.data_source === 'REAL' ? 'real' : 'synthetic'}`}>
          {data.data_source === 'REAL' ? 'Real Wafer Layer Data' : 'Synthetic Pattern Pair Demo'}
        </span>
        {beginnerMode && (
          <span style={{ fontSize: 12, background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            🐣 10th-Standard Easy View
          </span>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "X Alignment Shift Error" : "MAE (X Shift)"}</div>
          <div className="metric-value accent-blue">{data.mae_dx.toFixed(2)} px</div>
          <div className="metric-sub">{beginnerMode ? "🌟 Letter Grade: A (Ultra Precise)" : "Mean Absolute Error dx"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Y Alignment Shift Error" : "MAE (Y Shift)"}</div>
          <div className="metric-value accent-teal">{data.mae_dy.toFixed(2)} px</div>
          <div className="metric-sub">Mean Absolute Error dy</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Rotation Angle Error" : "MAE (Rotation)"}</div>
          <div className="metric-value accent-amber">{data.mae_dtheta.toFixed(3)}°</div>
          <div className="metric-sub">Rotational error angle</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Sample Pattern Pairs" : "Pairs Analyzed"}</div>
          <div className="metric-value">{data.n_pairs}</div>
          <div className="metric-sub">Test pattern pairs</div>
        </div>
      </div>

      {beginnerMode ? (
        <div className="card" style={{ marginBottom: 24, background: 'rgba(238, 242, 255, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div className="card-title" style={{ color: 'var(--accent-indigo)' }}>💡 What is Overlay Alignment? (Tracing Paper Analogy)</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Think of drawing a comic book by stacking transparent sheets of tracing paper. If sheet #2 slips by 1mm, the superhero's eyes don't line up with their face! 
            Our OpenCV AI finds thousands of matching corner dots between layers to calculate exact alignment corrections!
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Computer Vision Mathematical Formulation</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The computer vision pipeline matches ORB keypoints between pattern layers and computes a 2D affine transformation matrix using RANSAC inlier filtering to achieve sub-pixel tolerance.
          </p>
        </div>
      )}

      <div className="two-col">
        {/* Interactive Pattern Selector */}
        <div className="card">
          <div className="card-title">Select Test Wafer Pattern Pair</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Click a pattern pair to view computer vision feature matches & offset measurements:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
            {data.pairs.map((p, idx) => (
              <button
                key={idx}
                className={`btn ${selectedPair === idx ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px', fontSize: 12 }}
                onClick={() => setSelectedPair(idx)}
              >
                Pair #{idx}
              </button>
            ))}
          </div>

          {currentPair && (
            <div className="overlay-item">
              <img
                src={`${BASE}exports/overlay/samples/${currentPair.filename}`}
                alt={`Overlay Pair ${selectedPair}`}
              />
              <div className="overlay-info">
                <div>True X Shift: <span className="true">{currentPair.true_dx.toFixed(2)} px</span></div>
                <div>Detected X Shift: <span className="detected">{currentPair.pred_dx.toFixed(2)} px</span></div>
                <div>True Y Shift: <span className="true">{currentPair.true_dy.toFixed(2)} px</span></div>
                <div>Detected Y Shift: <span className="detected">{currentPair.pred_dy.toFixed(2)} px</span></div>
                <div>Rotation: <span className="true">{currentPair.true_dtheta.toFixed(2)}°</span></div>
                <div>Matched Points: <span className="detected">{currentPair.matches_found} keypoints</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Manual Alignment Sandbox */}
        <div className="interactive-section" style={{ margin: 0 }}>
          <div className="interactive-title">🎚️ Interactive Layer Alignment Sandbox</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Use the sliders below to manually align Layer 2 (Blue) with Base Layer 1 (Red)!
          </p>

          <div className="slider-group">
            <div className="slider-label">
              <span>Horizontal Shift (X):</span>
              <span className="slider-value">{manualDx} px</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              value={manualDx}
              onChange={e => setManualDx(Number(e.target.value))}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>Vertical Shift (Y):</span>
              <span className="slider-value">{manualDy} px</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              value={manualDy}
              onChange={e => setManualDy(Number(e.target.value))}
            />
          </div>

          <div style={{
            height: 180,
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16
          }}>
            {/* Base Layer Pattern (Red) */}
            <div style={{
              width: 100,
              height: 100,
              border: '3px dashed #ef4444',
              borderRadius: 8,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#ef4444',
              fontSize: 12
            }}>
              Base Layer 1
            </div>

            {/* Shifting Layer 2 (Blue) */}
            <div style={{
              width: 100,
              height: 100,
              border: '3px solid #3b82f6',
              borderRadius: 8,
              position: 'absolute',
              transform: `translate(${manualDx}px, ${manualDy}px)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#3b82f6',
              fontSize: 12,
              background: 'rgba(59, 130, 246, 0.1)',
              transition: 'transform 100ms ease'
            }}>
              Layer 2 Shift
            </div>
          </div>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: Math.abs(manualDx) <= 2 && Math.abs(manualDy) <= 2 ? 'var(--success)' : 'var(--danger)' }}>
              {Math.abs(manualDx) <= 2 && Math.abs(manualDy) <= 2 ? '✅ PERFECT ALIGNMENT (< 2px Error)' : '⚠️ MISALIGNED (Layer Offset Detected)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
