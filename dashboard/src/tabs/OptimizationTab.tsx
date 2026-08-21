import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'

const BASE = import.meta.env.BASE_URL

interface ConvergencePoint {
  iteration: number
  yield: number
  best_yield_so_far: number
  temperature: number
  pressure: number
  time: number
}

interface Convergence {
  data_source: string
  method: string
  iterations: ConvergencePoint[]
}

interface OptResults {
  data_source: string
  data_source_note: string
  method: string
  n_iterations: number
  best_found_yield: number
  best_found_params: { temperature: number; pressure: number; time: number }
  true_optimum_params: { temperature: number; pressure: number; time: number }
  true_max_yield_no_noise: number
  yield_gap: number
  bounds: Record<string, [number, number]>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Iteration {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {(p.value * 100).toFixed(2)}%
        </div>
      ))}
    </div>
  )
}

export default function OptimizationTab() {
  const [convergence, setConvergence] = useState<Convergence | null>(null)
  const [results, setResults] = useState<OptResults | null>(null)

  useEffect(() => {
    fetch(`${BASE}exports/optimization/convergence.json`)
      .then(r => r.json()).then(setConvergence).catch(() => {})
    fetch(`${BASE}exports/optimization/results.json`)
      .then(r => r.json()).then(setResults).catch(() => {})
  }, [])

  if (!results || !convergence) {
    return <div className="empty-state"><div className="spinner" /><p style={{marginTop:16}}>Loading optimization data...</p></div>
  }

  const chartData = convergence.iterations.map(pt => ({
    iteration: pt.iteration,
    'Observed yield': pt.yield,
    'Best so far': pt.best_yield_so_far,
  }))

  return (
    <div>
      <div className="section-header">
        <h2>Process Parameter Optimization</h2>
        <p>
          Finding the temperature, pressure, and process time that maximize simulated yield —
          using Bayesian optimization. This is a <strong>simulation</strong> with a known synthetic
          objective function, not a validated fab model. It demonstrates how optimization algorithms
          converge toward an optimal recipe with far fewer experiments than random search.
        </p>
      </div>

      <span className="data-badge synthetic">
        Simulation — Synthetic Objective Function
      </span>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Best Yield Found</div>
          <div className="metric-value accent-blue">{(results.best_found_yield * 100).toFixed(2)}%</div>
          <div className="metric-sub">After {results.n_iterations} iterations</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">True Max Yield</div>
          <div className="metric-value accent-teal">{(results.true_max_yield_no_noise * 100).toFixed(2)}%</div>
          <div className="metric-sub">Known optimum (no noise)</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Yield Gap</div>
          <div className="metric-value accent-amber">{(results.yield_gap * 100).toFixed(2)}%</div>
          <div className="metric-sub">Best found vs true optimum</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Method</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
            {results.method.split('(')[0].trim()}
          </div>
          <div className="metric-sub">{results.n_iterations} total iterations</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Why Bayesian Optimization?</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Every fab experiment costs money — wafer time, engineer time, material. You can't run
          10,000 random trials to find the best recipe. Bayesian optimization builds a probabilistic
          model (Gaussian process) of the yield surface, balancing exploration (uncertain regions)
          and exploitation (currently good regions). The convergence chart shows yield improving
          rapidly in early iterations as the optimizer learns, then refining more slowly — the
          classic pattern of efficient black-box optimization.
        </p>
      </div>

      {/* Convergence chart */}
      <div className="chart-container">
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Convergence: Yield vs Iteration
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
            <XAxis
              dataKey="iteration"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              label={{ value: 'Iteration', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              domain={[0, 1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            <ReferenceLine
              y={results.true_max_yield_no_noise}
              stroke="var(--accent-teal)"
              strokeDasharray="6 3"
              label={{ value: 'True Optimum', position: 'right', fill: 'var(--accent-teal)', fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="Observed yield"
              stroke="rgba(0,170,255,0.4)"
              dot={false}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="Best so far"
              stroke="var(--accent-blue)"
              dot={false}
              strokeWidth={2.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Best found vs true optimum */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Best Found Parameters vs True Optimum
        </div>
        <div className="opt-results-grid">
          {(['temperature', 'pressure', 'time'] as const).map(param => (
            <div key={param} className="opt-param">
              <div className="opt-param-name">{param}</div>
              <div className="opt-param-values">
                <span>
                  <span className="opt-param-found">{results.best_found_params[param]}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>found</span>
                </span>
                <span>
                  <span className="opt-param-true">{results.true_optimum_params[param]}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>true</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        {results.data_source_note}
      </div>
    </div>
  )
}
