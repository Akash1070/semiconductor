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
              background: beginnerMode ? 'linear-gradient(135deg, #4f46e5, #0891b2)' : '#ffffff',
              color: beginnerMode ? '#ffffff' : '#475569',
              border: beginnerMode ? 'none' : '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: beginnerMode ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {beginnerMode ? '🐣 10th-Standard View: ON' : '⚙️ Pro Mode View'}
          </button>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>by Akash Kumar Jha</span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <a href="https://github.com/Akash1070/semiconductor" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </header>

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
        {activeTab === 'wafer'   && <WaferTab beginnerMode={beginnerMode} />}
        {activeTab === 'yield'   && <YieldTab beginnerMode={beginnerMode} />}
        {activeTab === 'overlay' && <OverlayTab beginnerMode={beginnerMode} />}
        {activeTab === 'optim'   && <OptimizationTab beginnerMode={beginnerMode} />}
        {activeTab === 'notes'   && <NotesTab />}
      </main>
    </div>
  )
}
