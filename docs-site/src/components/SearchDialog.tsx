import { useState, useEffect } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import { NAV } from '../data/site'

interface SearchDialogProps {
  onClose: () => void
}

export function SearchDialog({ onClose }: SearchDialogProps) {
  const [q, setQ] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const filtered = NAV.filter(
    (n) =>
      n.label.toLowerCase().includes(q.toLowerCase()) ||
      n.blurb.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '600px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <Search size={20} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu kỹ thuật SafeHome 3D AI..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '0.5rem' }}>
          {filtered.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Không tìm thấy tài liệu phù hợp.</p>
          ) : (
            filtered.map((item) => (
              <a
                key={item.id}
                href={`#${item.path}`}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  color: '#fff',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--primary-hover)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.blurb}</div>
                </div>
                <ArrowRight size={16} color="var(--text-dim)" />
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

