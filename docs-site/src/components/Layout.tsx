import { useState, useEffect, type ReactNode } from 'react'
import { Github, Menu, Search as SearchIcon, X, ShieldCheck } from 'lucide-react'
import { NAV, REPO_URL } from '../data/site'
import { SearchDialog } from './SearchDialog'

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearching(true)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Chuyển đến nội dung chính
      </a>
      <header className="nav">
        <div className="nav-inner">
          <a className="brand" href="#/" aria-label="SafeHome 3D AI Docs Home">
            <img src="./logo.png" alt="SafeHome 3D AI" width={30} height={30} style={{ borderRadius: '6px' }} />
            <span>SafeHome 3D AI</span>
            <span className="brand-badge hide-sm">Technical Docs</span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.path}`} aria-current={n.path === path ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <button type="button" className="icon-btn" onClick={() => setSearching(true)} aria-label="Tìm kiếm tài liệu (Ctrl+K)">
              <SearchIcon size={16} aria-hidden /><span className="hide-sm">Tìm kiếm</span><kbd className="hide-sm">Ctrl K</kbd>
            </button>
            <a className="icon-btn gh" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub Repository">
              <Github size={16} aria-hidden /><span className="hide-sm">GitHub</span>
            </a>
            <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Đóng menu' : 'Mở menu'}>
              {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="drawer" className="drawer" aria-label="Mobile">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.path}`} aria-current={n.path === path ? 'page' : undefined}>
                <strong>{n.label}</strong>
                <span>{n.blurb}</span>
              </a>
            ))}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
      <footer className="footer">
        <p><strong>SafeHome 3D AI</strong> — Nhà an toàn, tuổi già an tâm · Cổng tài liệu kiến trúc kỹ thuật & kiểm thử y tế.</p>
        <p className="mono dim">Đồng bộ trực tiếp với mã nguồn GitHub · Tuân thủ khuyến nghị y tế WHO 2021 & CDC STEADI</p>
      </footer>
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
    </>
  )
}

