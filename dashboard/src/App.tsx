import { useState } from 'react'
import WaferTab from './tabs/WaferTab'
import YieldTab from './tabs/YieldTab'
import OverlayTab from './tabs/OverlayTab'
import OptimizationTab from './tabs/OptimizationTab'
import NotesTab from './tabs/NotesTab'

const TABS = [
  { id: 'wafer',    label: '⬡ Wafer Classifier' },
  { id: 'yield',    label: '📊 Yield Prediction' },
  { id: 'overlay',  label: '🔬 Overlay Detection' },
  { id: 'optim',    label: '⚡ Process Optimization' },
  { id: 'notes',    label: '📋 Fab Notes' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('wafer')
  const [beginnerMode, setBeginnerMode] = useState(true)

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <h1>Semiconductor AI Portfolio</h1>
          <p>Applied AI & Machine Learning for Microchip Manufacturing</p>
        </div>
        <div className="header-badge" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setBeginnerMode(!beginnerMode)}
            style={{
              background: beginnerMode ? 'var(--accent-teal)' : 'var(--bg-surface)',
              color: beginnerMode ? '#000' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {beginnerMode ? '🐣 Beginner Mode: ON' : '⚙️ Pro Mode'}
          </button>
          <span>·</span>
          <span>by Akash Kumar Jha</span>
          <span>·</span>
          <a href="https://github.com/Akash1070/semiconductor" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </header>

      {beginnerMode && (
        <div style={{
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid var(--accent-blue)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: 'var(--text-primary)'
        }}>
          <strong>🐣 Simple Explanation for Everyone (10th Standard Friendly):</strong> Microchips (like the ones inside your phone or computer) are built on big round shiny silicon plates called <strong>Wafers</strong>. Making chips takes hundreds of complex steps! This dashboard uses AI to:
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li><strong>Wafer Classifier:</strong> Scan the wafer surface to spot bad defect patterns (like scratches or edge rings).</li>
            <li><strong>Yield Prediction:</strong> Predict if microchips will PASS or FAIL before wasting time testing them.</li>
            <li><strong>Overlay Detection:</strong> Make sure microscopic circuit layers line up perfectly like stacking tracing paper.</li>
            <li><strong>Process Optimization:</strong> Automatically find the best temperature & pressure recipe to make maximum working chips!</li>
          </ul>
        </div>
      )}

      <nav className="tab-nav" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {activeTab === 'wafer'   && <WaferTab />}
        {activeTab === 'yield'   && <YieldTab />}
        {activeTab === 'overlay' && <OverlayTab />}
        {activeTab === 'optim'   && <OptimizationTab />}
        {activeTab === 'notes'   && <NotesTab />}
      </main>
    </div>
  )
}
