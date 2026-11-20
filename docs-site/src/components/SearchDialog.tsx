import { useEffect, useMemo, useRef, useState } from 'react'
import { NAV } from '../data/site'

interface Doc { title: string; kind: string; path: string; text: string }

const INDEX: Doc[] = [
  ...NAV.map((n) => ({ title: n.label, kind: 'Phân hệ', path: n.path, text: n.blurb })),
  { title: 'RUG_NO_GRIP', kind: 'Quy tắc Y khoa', path: '/risk', text: 'Thảm trải sàn không dán cố định tại lối đi người già -20 điểm WHO/CDC' },
  { title: 'BED_HEIGHT_UNSAFE', kind: 'Quy tắc Y khoa', path: '/risk', text: 'Chiều cao nệm giường ngoài khoảng 45-50cm an toàn gối -15 điểm' },
  { title: 'NIGHT_PATH_DARK', kind: 'Quy tắc Y khoa', path: '/risk', text: 'Độ rọi ban đêm dưới 50 Lux trên lối đi vệ sinh -20 điểm WHO 2021' },
  { title: 'NO_BATH_GRAB_BAR', kind: 'Quy tắc Y khoa', path: '/risk', text: 'Thiếu thanh vịn bồn cầu hoặc thanh vịn buồng tắm -25 điểm CDC STEADI' },
  { title: 'CLUTTER_ON_FLOOR', kind: 'Quy tắc Y khoa', path: '/risk', text: 'Dây điện quạt, hộp carton, dép lê chắn ngang hành lang -15 điểm' },
  { title: 'SLIPPERY_FLOOR', kind: 'Quy tắc Y khoa', path: '/risk', text: 'Sàn phòng tắm trơn trượt thiếu ma sát nano / thảm giác hút -25 điểm' },
  { title: 'Thẩm định nguy cơ vật dụng', kind: 'Tính năng Vision', path: '/vision', text: 'Đánh giá đồ vật theo CDC STEADI, ghim nguy cơ H1..H4, click-to-reposition' },
  { title: 'Photorealistic Dollhouse', kind: 'Tính năng 3D', path: '/digital-twin', text: 'Mô hình kiến trúc tham chiếu phòng ngủ & vệ sinh, studio ánh sáng 4 chế độ' },
  { title: 'Smart Marker Clustering', kind: 'Thuật toán 3D', path: '/digital-twin', text: 'Gom cụm nhãn nguy cơ Euclidean bán kính < 0.95m chống đè lấn' },
  { title: 'SafeHome Copilot RAG', kind: 'Trợ lý AI', path: '/xai', text: 'Ngăn tra cứu bằng chứng 4 tab, đối chứng WHO/CDC, SafeHomeMarkdown' },
  { title: 'POST /api/vision/assess-item', kind: 'Endpoint API', path: '/api', text: 'Thẩm định rủi ro vật dụng qua ảnh theo chuẩn CDC STEADI & WHO 2021' },
  { title: 'POST /api/ai/chat', kind: 'Endpoint API', path: '/api', text: 'Tư vấn an toàn phòng ngừa té ngã có trích dẫn tài liệu y tế chuẩn' },
  { title: 'POST /api/simulations', kind: 'Endpoint API', path: '/api', text: 'Lưu trữ kịch bản can thiệp mô phỏng 3D đa phòng' },
  { title: 'GET /api/rag/eval', kind: 'Endpoint API', path: '/api', text: 'Đánh giá Benchmark RAG 8 tiêu chí y khoa độc lập' },
]

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => {
      window.removeEventListener('keydown', on)
      opener?.focus?.()
    }
  }, [onClose])

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    return INDEX.map((d) => {
      const title = d.title.toLowerCase()
      const hay = `${title} ${d.text.toLowerCase()} ${d.kind.toLowerCase()}`
      if (!terms.every((t) => hay.includes(t))) return null
      return { d, score: terms.reduce((s, t) => s + (title.includes(t) ? 3 : 1), 0) }
    }).filter((r): r is { d: Doc; score: number } => r !== null).sort((a, b) => b.score - a.score).slice(0, 30)
  }, [q])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Tìm kiếm tài liệu" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box search">
        <input
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm kiếm phân hệ, quy tắc y tế, công nghệ 3D, API..."
          aria-label="Tìm kiếm"
        />
        <ul>
          {results.map(({ d }, i) => (
            <li key={i}>
              <a href={`#${d.path}`} onClick={onClose}>
                <span className="mono dim">{d.kind}</span>
                <strong>{d.title}</strong>
                <small>{d.text.slice(0, 115)}</small>
              </a>
            </li>
          ))}
          {q && !results.length && <li className="empty">Không tìm thấy kết quả phù hợp với “{q}”.</li>}
          {!q && <li className="empty">Gợi ý tìm kiếm: “RUG_NO_GRIP”, “Dollhouse”, “/api/vision”, hoặc “CDC STEADI”. Phím Esc để đóng.</li>}
        </ul>
      </div>
    </div>
  )
}
