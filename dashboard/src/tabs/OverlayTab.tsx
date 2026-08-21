import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

interface OverlayPair {
  pair_id: number
  true_dx: number
  true_dy: number
  true_angle_deg: number
  detected_dx: number
  detected_dy: number
  detected_angle_deg: number
  error_dx: number
  error_dy: number
  error_angle_deg: number
}

interface Results {
  data_source: string
  data_source_note: string
  n_pairs: number
  n_saved_samples: number
  mean_error_dx_px: number
  mean_error_dy_px: number
  mean_error_angle_deg: number
  detector_method: string
  pairs: OverlayPair[]
}

export default function OverlayTab() {
  const [results, setResults] = useState<Results | null>(null)
  const [selectedPair, setSelectedPair] = useState(0)

  useEffect(() => {
    fetch(`${BASE}exports/overlay/results.json`)
      .then(r => r.json()).then(setResults).catch(() => {})
  }, [])

  if (!results) {
    return <div className="empty-state"><div className="spinner" /><p style={{marginTop:16}}>Loading overlay detection data...</p></div>
  }

  const n_display = results.n_saved_samples

  return (
    <div>
      <div className="section-header">
        <h2>Overlay Error Detection</h2>
        <p>
          Photolithography aligns a new mask pattern on top of previously exposed layers.
          Any misalignment — even nanometers in production — shifts transistors out of position.
          This demo generates synthetic die pattern pairs with known misalignments, then uses
          OpenCV (ORB feature matching + RANSAC) to detect and measure those offsets.
          The metric that matters: how close is the detected misalignment to the known true value?
        </p>
      </div>

      <span className="data-badge synthetic">
        Synthetic Data — Ground Truth Known
      </span>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Mean |Δx| Error</div>
          <div className="metric-value accent-blue">{results.mean_error_dx_px.toFixed(1)} px</div>
          <div className="metric-sub">Over {results.n_pairs} pairs</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Mean |Δy| Error</div>
          <div className="metric-value accent-teal">{results.mean_error_dy_px.toFixed(1)} px</div>
          <div className="metric-sub">Over {results.n_pairs} pairs</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Mean Angle Error</div>
          <div className="metric-value accent-amber">{results.mean_error_angle_deg.toFixed(2)}°</div>
          <div className="metric-sub">Rotation detection</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Pairs</div>
          <div className="metric-value">{results.n_pairs}</div>
          <div className="metric-sub">Synthetic ground-truth pairs</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">How It Works</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Each pair: a base die pattern (grid of squares with corner markers) + a second layer
          with a random (x, y, θ) misalignment applied. ORB detects keypoints in both images,
          BFMatcher finds correspondences, and RANSAC fits an affine transform to recover the
          misalignment. The error = |detected offset − true offset|. In real fabs, this is done
          by dedicated metrology tools (e.g., KLA ARCHER) using special overlay targets —
          this demo illustrates the concept using computer vision.
        </p>
      </div>

      {/* Image viewer */}
      <div className="interactive-section">
        <div className="interactive-title">Before / After Viewer</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: n_display }, (_, i) => (
            <button
              key={i}
              id={`overlay-btn-${i}`}
              className={`btn ${selectedPair === i ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={() => setSelectedPair(i)}
            >
              Pair {i}
            </button>
          ))}
        </div>

        <div className="overlay-item" style={{ maxWidth: 620 }}>
          <img
            src={`${BASE}exports/overlay/samples/pair_${String(selectedPair).padStart(2,'0')}.png`}
            alt={`Overlay pair ${selectedPair}: base layer and shifted layer`}
            style={{ width: '100%', imageRendering: 'pixelated' }}
          />
          <div className="overlay-info">
            <span style={{ gridColumn: '1/-1', color: 'var(--text-muted)', marginBottom: 4, fontSize: 10 }}>
              Left: Base layer · Right: Misaligned layer (annotated)
            </span>
            {results.pairs[selectedPair] && (
              <>
                <span className="true">True Δx: {results.pairs[selectedPair].true_dx.toFixed(1)} px</span>
                <span className="detected">Det Δx: {results.pairs[selectedPair].detected_dx.toFixed(1)} px</span>
                <span className="true">True Δy: {results.pairs[selectedPair].true_dy.toFixed(1)} px</span>
                <span className="detected">Det Δy: {results.pairs[selectedPair].detected_dy.toFixed(1)} px</span>
                <span className="true">True θ: {results.pairs[selectedPair].true_angle_deg.toFixed(2)}°</span>
                <span className="detected">Det θ: {results.pairs[selectedPair].detected_angle_deg.toFixed(2)}°</span>
                <span style={{ color: 'var(--danger)' }}>|err Δx|: {results.pairs[selectedPair].error_dx.toFixed(1)} px</span>
                <span style={{ color: 'var(--danger)' }}>|err Δy|: {results.pairs[selectedPair].error_dy.toFixed(1)} px</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        Detector: {results.detector_method} · {results.data_source_note}
      </div>
    </div>
  )
}
