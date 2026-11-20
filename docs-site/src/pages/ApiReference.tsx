import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { API_GROUPS, type Endpoint } from '../data/api'
import { CodeBlock } from '../components/CodeBlock'
import { PageHeader, Callout, Src } from '../components/ui'

const ACCESS: Record<string, string> = {
  public: 'Public / Client Endpoint',
  optional: 'Optional Patient Context',
  session: 'Active Session / Survey',
  clinician: 'Clinician / Geriatrician',
  admin: 'System Administrator',
}

function Row({ e }: { e: Endpoint }) {
  const [open, setOpen] = useState(false)
  const expandable = Boolean(e.request || e.response)
  return (
    <li className="ep">
      <button
        type="button"
        className="ep-head"
        onClick={() => expandable && setOpen(!open)}
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
      >
        <span className={`method m-${e.method}`}>{e.method}</span>
        <code className="path">{e.path}</code>
        {e.access && <span className="acc mono">{ACCESS[e.access]}</span>}
        {expandable && (
          <ChevronDown
            size={16}
            className={open ? 'rot' : ''}
            style={{ marginLeft: 'auto', transition: 'transform 0.15s ease' }}
            aria-hidden
          />
        )}
      </button>
      <p className="ep-sum">
        {e.summary} <span className="mono dim" style={{ fontSize: '0.76rem', color: 'var(--muted)', marginLeft: 8 }}><Src path={e.source} /></span>
      </p>
      {open && (
        <div className="ep-body">
          {e.request && <CodeBlock label="Request Payload (JSON)" code={e.request} />}
          {e.response && <CodeBlock label="Response Body (200 OK JSON)" code={e.response} />}
        </div>
      )}
    </li>
  )
}

export default function ApiReference() {
  const [group, setGroup] = useState('all')
  const [q, setQ] = useState('')

  const groups = useMemo(() => {
    return API_GROUPS.map((g) => ({
      ...g,
      endpoints: g.endpoints.filter(
        (e) =>
          (group === 'all' || group === g.id) &&
          `${e.method} ${e.path} ${e.summary}`.toLowerCase().includes(q.toLowerCase())
      ),
    })).filter((g) => g.endpoints.length > 0)
  }, [group, q])

  const total = API_GROUPS.reduce((n, g) => n + g.endpoints.length, 0)

  return (
    <section className="page">
      <PageHeader
        eyebrow="RESTful API Specification"
        title="SafeHome 3D AI API Reference"
        lead={`${total} production endpoints powering Computer Vision, Item Hazard Assessment, Deterministic Risk Evaluation, Adaptive Surveying, and Clinical RAG Copilot.`}
      />

      <Callout tone="note" title="Production Standards & Type Safety">
        Endpoints are implemented via Next.js App Router Route Handlers (<code>src/app/api/**/*.ts</code>). All incoming request bodies are validated against runtime Zod schemas with TypeScript type inference. Database mutations are managed through Prisma ORM across 16 relational models.
      </Callout>

      <div className="filters">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--muted)' }} />
          <input
            style={{ paddingLeft: 40 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm endpoint theo đường dẫn, phương thức, hoặc chức năng (vd: assess-item, evaluate, chat)..."
            aria-label="Filter endpoints"
          />
        </div>
        <div className="chips" role="group" aria-label="Endpoint Groups">
          <button
            type="button"
            className={group === 'all' ? 'chip on' : 'chip'}
            aria-pressed={group === 'all'}
            onClick={() => setGroup('all')}
          >
            Tất cả ({total})
          </button>
          {API_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={group === g.id ? 'chip on' : 'chip'}
              aria-pressed={group === g.id}
              onClick={() => setGroup(g.id)}
            >
              {g.title.split('.')[1] || g.title} ({g.endpoints.length})
            </button>
          ))}
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.id} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--cyan)' }}>■</span> {g.title}
          </h2>
          <ul className="eps">
            {g.endpoints.map((e) => (
              <Row key={e.method + e.path} e={e} />
            ))}
          </ul>
        </div>
      ))}

      {!groups.length && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          Không tìm thấy endpoint nào phù hợp với từ khóa "{q}".
        </div>
      )}
    </section>
  )
}
