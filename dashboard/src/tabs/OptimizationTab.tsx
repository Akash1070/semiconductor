import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const BASE = import.meta.env.BASE_URL

interface StepData {
  iteration: number
  yield_pct: number
  best_so_far: number
  temp: number
  pressure: number
  time: number
}

interface OptimizationResults {
  data_source: string
  best_yield_pct: number
  true_optimum_yield_pct: number
  n_calls: number
  recipe_found: { temp: number; pressure: number; time: number }
  recipe_true: { temp: number; pressure: number; time: number }
  convergence: StepData[]
}

interface OptimizationTabProps {
  beginnerMode?: boolean
}

export default function OptimizationTab({ beginnerMode = true }: OptimizationTabProps) {
  const [data, setData] = useState<OptimizationResults | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(0)

  useEffect(() => {
    fetch(`${BASE}exports/optimization/results.json`)
      .then(r => r.json()).then(res => {
        setData(res)
        if (res.convergence) {
          setCurrentStep(res.convergence.length - 1)
        }
      }).catch(() => {})
  }, [])

  if (!data) {
    return <div className="empty-state"><div className="spinner" /><p style={{marginTop:16}}>Loading optimization convergence data...</p></div>
  }

  const activeStepData = data.convergence[currentStep] || data.convergence[0]

  return (
    <div>
      <div className="section-header">
        <h2>Process Parameter Optimization (Bayesian Optimization)</h2>
        <p>
          {beginnerMode
            ? "Finding the perfect factory recipe (oven temperature, pressure, and time) used to take thousands of trial runs. This smart AI finds the best recipe in just 30 steps!"
            : "Bayesian Optimization utilizing Gaussian Process (GP) surrogate modeling and Expected Improvement (EI) acquisition function to optimize non-linear yield surfaces."}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <span className={`data-badge ${data.data_source === 'REAL' ? 'real' : 'synthetic'}`}>
          {data.data_source === 'REAL' ? 'Real Fab Optimization Run' : 'Synthetic Fab Surface Model'}
        </span>
        {beginnerMode && (
          <span style={{ fontSize: 12, background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-indigo)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            🐣 10th-Standard Easy View
          </span>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Best AI Yield Score" : "Achieved Yield"}</div>
          <div className="metric-value accent-teal">{data.best_yield_pct.toFixed(1)}%</div>
          <div className="metric-sub">{beginnerMode ? "🌟 Letter Grade: A+ (Optimal)" : "Found Optimum"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Theoretical Maximum" : "True Maximum"}</div>
          <div className="metric-value accent-blue">{data.true_optimum_yield_pct.toFixed(1)}%</div>
          <div className="metric-sub">Theoretical Limit</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Yield Gap to Perfection" : "Yield Gap"}</div>
          <div className="metric-value accent-amber">{(data.true_optimum_yield_pct - data.best_yield_pct).toFixed(2)}%</div>
          <div className="metric-sub">Optimality Offset</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{beginnerMode ? "Trial Runs Needed" : "Evaluations"}</div>
          <div className="metric-value">{data.n_calls}</div>
          <div className="metric-sub">Iterations</div>
        </div>
      </div>

      {beginnerMode ? (
        <div className="card" style={{ marginBottom: 24, background: 'rgba(238, 242, 255, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div className="card-title" style={{ color: 'var(--accent-indigo)' }}>💡 What is Recipe Optimization? (Baking Analogy)</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Imagine baking a cake. If you don't know the exact oven temperature or baking time, you could waste 1,000 cakes trying combinations. 
            <strong>Bayesian AI</strong> acts like a master chef: after just 5 test cakes, it predicts the exact temperature & pressure recipe to bake a perfect 97.6% yield cake!
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Gaussian Process Acquisition Dynamics</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Surrogate Gaussian Process model calculates expected yield mean and uncertainty. The Expected Improvement (EI) acquisition function balances exploration vs exploitation to optimize non-linear recipe parameters.
          </p>
        </div>
      )}

      {/* Interactive Step Stepper Controls */}
      <div className="interactive-section">
        <div className="interactive-title">
          <span>🎬 Interactive Search Step-by-Step Stepper (Step {currentStep + 1} of {data.convergence.length})</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Use the stepper buttons to travel through time and watch the AI explore different recipe temperatures & pressures!
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            disabled={currentStep <= 0}
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          >
            ← Previous Step
          </button>
          <button
            className="btn btn-primary"
            disabled={currentStep >= data.convergence.length - 1}
            onClick={() => setCurrentStep(prev => Math.min(data.convergence.length - 1, prev + 1))}
          >
            Next Step →
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setCurrentStep(data.convergence.length - 1)}
          >
            Jump to Final Winner (Step 30)
          </button>

          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--accent-indigo)' }}>
            Step {currentStep + 1} Yield: <strong>{activeStepData.best_so_far.toFixed(1)}%</strong>
          </span>
        </div>

        {/* Recharts Yield Convergence Chart */}
        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.convergence}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="iteration" label={{ value: 'Trial Run #', position: 'insideBottom', offset: -5 }} />
              <YAxis domain={[60, 100]} label={{ value: 'Yield %', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'Yield']} />
              <Line type="monotone" dataKey="yield_pct" stroke="#94a3b8" strokeWidth={1} dot={{ r: 2 }} name="Trial Evaluation" />
              <Line type="stepAfter" dataKey="best_so_far" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} name="Best AI Yield So Far" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Active Step Parameters */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ background: '#ffffff', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>OVEN TEMP (T)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-indigo)' }}>{activeStepData.temp.toFixed(1)} °C</div>
          </div>
          <div style={{ background: '#ffffff', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>CHAMBER PRESSURE (P)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-cyan)' }}>{activeStepData.pressure.toFixed(2)} Torr</div>
          </div>
          <div style={{ background: '#ffffff', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>PROCESS TIME (t)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-teal)' }}>{activeStepData.time.toFixed(1)} sec</div>
          </div>
        </div>
      </div>
    </div>
  )
}
