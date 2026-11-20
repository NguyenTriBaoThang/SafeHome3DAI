import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import {
  Github,
  Menu,
  Search as SearchIcon,
  X,
  ExternalLink,
  Compass,
  Network,
  ShieldCheck,
  ClipboardCheck,
  Camera,
  Box,
  Activity,
  GitFork,
  Code2,
} from 'lucide-react'
import { NAV_GROUPS, REPO_URL, LIVE_URL } from '../data/site'

const SearchDialog = lazy(() => import('./SearchDialog').then((m) => ({ default: m.SearchDialog })))

const NAV_ICONS: Record<string, typeof Compass> = {
  overview: Compass,
  architecture: Network,
  tests: ShieldCheck,
  survey: ClipboardCheck,
  vision: Camera,
  'digital-twin': Box,
  risk: Activity,
  xai: GitFork,
  api: Code2,
}

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
        Skip to content
      </a>

      {/* Top Navbar */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn menu-toggle hide-desktop"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? 'Close navigation sidebar' : 'Open navigation sidebar'}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <a className="brand" href="#/" aria-label="SafeHome 3D AI Docs Home">
              <img src="./logo.png" alt="" width={28} height={28} style={{ borderRadius: '6px' }} />
              <span className="brand-title">SafeHome 3D AI</span>
              <span className="brand-badge hide-sm">Technical Docs</span>
            </a>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="search-trigger-btn"
              onClick={() => setSearching(true)}
              aria-label="Search documentation (Ctrl+K)"
            >
              <SearchIcon size={15} aria-hidden />
              <span className="search-placeholder">Tìm kiếm tài liệu...</span>
              <kbd className="search-kbd hide-sm">Ctrl K</kbd>
            </button>

            <a
              className="icon-btn live-btn hide-sm"
              href={LIVE_URL}
              target="_blank"
              rel="noreferrer"
              title="Mở ứng dụng SafeHome 3D AI cục bộ (localhost:3000)"
            >
              <ExternalLink size={15} aria-hidden />
              <span>Live App</span>
            </a>

            <a
              className="icon-btn gh-btn"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub Repository"
            >
              <Github size={16} aria-hidden />
              <span className="hide-sm">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Layout Shell with Left Sidebar */}
      <div className="docs-shell">
        {/* Left Sidebar (Desktop & Tablet) */}
        <aside className={`docs-sidebar ${open ? 'drawer-open' : ''}`} aria-label="Documentation Sidebar">
          <div className="sidebar-scroll">
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className="sidebar-group">
                <div className="sidebar-heading">{group.title}</div>
                <nav className="sidebar-nav">
                  {group.items.map((item) => {
                    const Icon = NAV_ICONS[item.id] || Compass
                    const isActive = item.path === path
                    return (
                      <a
                        key={item.id}
                        href={`#${item.path}`}
                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="link-icon">
                          <Icon size={16} />
                        </span>
                        <span className="link-label">{item.label}</span>
                        {item.badge && (
                          <span className={`link-badge ${isActive ? 'badge-active' : ''}`}>
                            {item.badge}
                          </span>
                        )}
                      </a>
                    )
                  })}
                </nav>
              </div>
            ))}

            <div className="sidebar-footer hide-sm">
              <div className="sys-status">
                <span className="status-dot"></span>
                <span>109 Vitest Tests (100% Passed)</span>
              </div>
              <div className="sys-sub">WHO 2021 & CDC STEADI Standard</div>
            </div>
          </div>
        </aside>

        {/* Backdrop for Mobile Drawer */}
        {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

        {/* Content Area */}
        <div className="docs-content">
          <main id="main" tabIndex={-1}>
            {children}
          </main>

          <footer className="footer">
            <p>
              <strong>SafeHome 3D AI — Technical Documentation Portal.</strong> Toàn bộ nội dung được đồng bộ thực tế từ mã nguồn hệ thống. Dữ liệu y khoa tuân thủ các hướng dẫn lâm sàng chính thức của WHO 2021 và CDC STEADI.
            </p>
            <p className="mono dim" style={{ marginTop: 6, fontSize: '0.82rem' }}>
              Static GitHub Pages · Zero Cloud Leakage · 109 Verified Vitest Tests (100% Pass Rate) · 16 Prisma Models
            </p>
          </footer>
        </div>
      </div>

      {searching && (
        <Suspense fallback={null}>
          <SearchDialog onClose={() => setSearching(false)} />
        </Suspense>
      )}
    </>
  )
}
