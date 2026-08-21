import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const BASE = import.meta.env.BASE_URL

export default function NotesTab() {
  const [content, setContent] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${BASE}exports/fab-floor-notes.md`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.text()
      })
      .then(setContent)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div>
        <div className="section-header">
          <h2>Fab Floor Notes</h2>
        </div>
        <div className="error-state">
          Could not load fab-floor-notes.md from public/exports/. 
          Make sure the file was copied during the build step.
        </div>
      </div>
    )
  }

  if (!content) {
    return <div className="empty-state"><div className="spinner" /><p style={{marginTop:16}}>Loading notes...</p></div>
  }

  return (
    <div>
      <div className="section-header">
        <h2>Fab Floor Notes</h2>
        <p>
          Plain-language reference on semiconductor fabrication — process steps, defect causes,
          and terminology relevant to the four portfolio projects.
        </p>
      </div>
      <div className="notes-content">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
