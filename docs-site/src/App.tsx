import { Suspense, lazy, useEffect, useRef } from 'react'
import { useRoute } from './router'
import { NAV } from './data/site'
import { Layout } from './components/Layout'

const pages: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  '/': lazy(() => import('./pages/Overview')),
  '/architecture': lazy(() => import('./pages/Architecture')),
  '/survey': lazy(() => import('./pages/Survey')),
  '/vision': lazy(() => import('./pages/Vision')),
  '/digital-twin': lazy(() => import('./pages/DigitalTwin')),
  '/risk': lazy(() => import('./pages/RiskEngine')),
  '/xai': lazy(() => import('./pages/XAI')),
  '/tests': lazy(() => import('./pages/Testing')),
  '/api': lazy(() => import('./pages/ApiReference')),
}

export function App() {
  const path = useRoute()
  const Page = pages[path]
  const item = NAV.find((n) => n.path === path)
  const first = useRef(true)

  useEffect(() => {
    document.title = item && item.id !== 'overview' 
      ? `${item.label} · SafeHome 3D AI Docs` 
      : 'SafeHome 3D AI — Technical Documentation Portal'
  }, [item])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [path])

  return (
    <Layout path={path}>
      <Suspense fallback={<p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải nội dung...</p>}>
        {Page ? <Page /> : <NotFound />}
      </Suspense>
    </Layout>
  )
}

function NotFound() {
  return (
    <section className="page">
      <h1>Không tìm thấy trang tài liệu</h1>
      <p style={{ color: 'var(--text-muted)' }}>Địa chỉ bạn yêu cầu không tồn tại. <a href="#/">Quay lại trang Tổng quan</a>.</p>
    </section>
  )
}

