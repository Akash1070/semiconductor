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

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <h1>Semiconductor AI Portfolio</h1>
          <p>Applied ML for Semiconductor Manufacturing</p>
        </div>
        <div className="header-badge">
          <span>by Akash Kumar Jha</span>
          <span>·</span>
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
        {activeTab === 'wafer'   && <WaferTab />}
        {activeTab === 'yield'   && <YieldTab />}
        {activeTab === 'overlay' && <OverlayTab />}
        {activeTab === 'optim'   && <OptimizationTab />}
        {activeTab === 'notes'   && <NotesTab />}
      </main>
    </div>
  )
}
