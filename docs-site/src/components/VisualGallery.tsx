import { useState } from 'react'
import { ZoomIn, X } from 'lucide-react'

// Direct Vite asset imports ensure 100% reliable loading across dev, preview, and GitHub Pages
import imgDemo01 from '../assets/screenshots/demo_01_dashboard.jpg'
import imgDemo02 from '../assets/screenshots/demo_02_digital_twin_dollhouse.jpg'
import imgDemo03 from '../assets/screenshots/demo_03_ai_vision_studio.jpg'
import imgDemo04 from '../assets/screenshots/demo_04_item_hazard_assessment.jpg'
import imgDemo05 from '../assets/screenshots/demo_05_item_hotspot_detail.jpg'
import imgDemo06 from '../assets/screenshots/demo_06_ai_chat_assistant.jpg'
import imgDemo07 from '../assets/screenshots/demo_07_rag_evidence_drawer.jpg'
import imgDemo08 from '../assets/screenshots/demo_08_xai_decision_graph.jpg'

export interface ScreenshotItem {
  id: string
  title: string
  category: 'overview' | 'vision' | 'twin' | 'copilot' | 'xai'
  categoryLabel: string
  image: string
  fallbackImage: string
  summary: string
  features: string[]
}

export const SCREENSHOTS: ScreenshotItem[] = [
  {
    id: 'dashboard',
    title: 'Tổng quan An toàn Môi trường & Bản đồ Rủi ro',
    category: 'overview',
    categoryLabel: 'Dashboard',
    image: imgDemo01,
    fallbackImage: './screenshots/demo_01_dashboard.jpg',
    summary: 'Bảng điều khiển trung tâm tổng hợp chỉ số an toàn 28/100, biểu đồ phân loại nguy cơ và không gian mô phỏng 3D thu nhỏ.',
    features: ['Chỉ số an toàn tổng hợp 0-100', 'Phân bổ nguy cơ theo loại phòng', 'Cảnh báo 4 mức ưu tiên khẩn cấp']
  },
  {
    id: 'twin',
    title: 'Bản sao số 3D — Photorealistic Bedroom & Bathroom Dollhouse',
    category: 'twin',
    categoryLabel: 'Bản sao 3D',
    image: imgDemo02,
    fallbackImage: './screenshots/demo_02_digital_twin_dollhouse.jpg',
    summary: 'Không gian số hóa phòng ngủ liền kề nhà vệ sinh khép kín với 4 chế độ ánh sáng (Nắng sớm, Ban ngày, Ban đêm 40 Lux, Studio 320 Lux) và chuyển đổi vật liệu chống trơn.',
    features: ['Góc nhìn Dollhouse cắt lớp thông minh', 'Studio ánh sáng ban đêm y học', 'Bổ sung thiết bị an toàn (thanh vịn, thảm hút)']
  },
  {
    id: 'vision_studio',
    title: 'SafeHome Vision Intelligence Studio',
    category: 'vision',
    categoryLabel: 'Thị giác AI',
    image: imgDemo03,
    fallbackImage: './screenshots/demo_03_ai_vision_studio.jpg',
    summary: 'Phân hệ quét ảnh hiện trường đa phương thức, nhận diện 18 lớp vật thể với khung bao 2D chuẩn xác, gán nhãn tỷ lệ tin cậy và đồng bộ tức thì vào khảo sát.',
    features: ['Phát hiện 18 lớp nội thất & vật cản', 'Hộp bao 2D & nhãn tỷ lệ % tin cậy', 'Đồng bộ hóa 1 chạm vào Room Profile']
  },
  {
    id: 'item_hazard',
    title: 'Thẩm Định Rủi Ro Vật Dụng Qua Ảnh (CDC STEADI Standard)',
    category: 'vision',
    categoryLabel: 'Thị giác AI',
    image: imgDemo04,
    fallbackImage: './screenshots/demo_04_item_hazard_assessment.jpg',
    summary: 'Tải ảnh vật dụng chụp gần để bóc tách rủi ro chuyên sâu: tính điểm nguy cơ CDC STEADI (68/100) và định vị các điểm rủi ro chỉ định H1, H2, H3 trực tiếp trên ảnh.',
    features: ['Đánh giá vật dụng độc lập bằng ảnh chụp', 'Chỉ định điểm nguy cơ H1, H2, H3', 'Giải trình cơ chế y khoa chấn thương']
  },
  {
    id: 'item_hotspot',
    title: 'Chi Tiết Điểm Rủi Ro H1 & Cơ Chế Chấn Thương Lâm Sàng',
    category: 'vision',
    categoryLabel: 'Thị giác AI',
    image: imgDemo05,
    fallbackImage: './screenshots/demo_05_item_hotspot_detail.jpg',
    summary: 'Mục giải thích chi tiết điểm H1 (Góc bàn vuông 90° sắc nhọn chân sắt), cơ chế tập trung áp lực va đập tại góc nhọn (Focal Blunt Impact) và tương tác kéo thả căn chỉnh tọa độ.',
    features: ['Bấm vào hotspot để xem chẩn đoán', 'Căn chỉnh tọa độ pin trực tiếp', 'Kế hoạch cải tạo chi phí thấp (~25.000 VNĐ)']
  },
  {
    id: 'copilot',
    title: 'Trợ Lý AI SafeHome Copilot & Đối Chiếu 3D',
    category: 'copilot',
    categoryLabel: 'RAG Copilot',
    image: imgDemo06,
    fallbackImage: './screenshots/demo_06_ai_chat_assistant.jpg',
    summary: 'Hội thoại thông minh hỗ trợ người chăm sóc, tự động đối chiếu số liệu không gian 3D đang khảo sát và gắn kèm trích dẫn y khoa [1] WHO, [2] NCOA, [3] BYT, [4] CDC.',
    features: ['Dẫn nguồn tài liệu y tế chuẩn mực', 'Liên kết trực tiếp vật thể phòng 3D', 'Tuyên bố pháp lý & an toàn môi trường']
  },
  {
    id: 'rag_drawer',
    title: 'Ngăn Kéo Bằng Chứng & Nguồn Dẫn RAG Chuyên Sâu',
    category: 'copilot',
    categoryLabel: 'RAG Copilot',
    image: imgDemo07,
    fallbackImage: './screenshots/demo_07_rag_evidence_drawer.jpg',
    summary: 'Ngăn kéo tra cứu bên phải hiển thị nguyên văn đoạn trích tài liệu y khoa từ World Health Organization và National Council on Aging, điều khoản chương mục và liên kết xác thực.',
    features: ['Trích xuất nguyên văn tài liệu gốc', 'Xác thực độ đầy đủ bằng chứng (Sufficiency)', 'Link truy xuất cổng thông tin chính thức']
  },
  {
    id: 'xai_graph',
    title: 'Giải Trình AI & Cây Phả Hệ Quyết Định (XAI & Audit Trail)',
    category: 'xai',
    categoryLabel: 'XAI Audit',
    image: imgDemo08,
    fallbackImage: './screenshots/demo_08_xai_decision_graph.jpg',
    summary: 'Cây suy luận nhân quả tương tác ReactFlow minh bạch 100% từng bước phán đoán: Vật thể 3D → Đo đạc không gian → Quy chuẩn y khoa → Nguy cơ → Đề xuất can thiệp.',
    features: ['Sơ đồ luồng đồ thị quyết định ReactFlow', 'Truy xuất nguồn gốc chuỗi quyết định', 'Loại bỏ hoàn toàn hộp đen AI']
  }
]

export function VisualGallery({ filterCategory }: { filterCategory?: string }) {
  const [activeCategory, setActiveCategory] = useState<string>(filterCategory || 'all')
  const [activeModal, setActiveModal] = useState<ScreenshotItem | null>(null)

  const items = SCREENSHOTS.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  )

  return (
    <div style={{ margin: '1.5rem 0' }}>
      {!filterCategory && (
        <div className="chips" role="group" aria-label="Lọc hình ảnh thực nghiệm" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={activeCategory === 'all' ? 'chip on' : 'chip'}
            onClick={() => setActiveCategory('all')}
          >
            Tất cả hình ảnh ({SCREENSHOTS.length})
          </button>
          <button
            type="button"
            className={activeCategory === 'overview' ? 'chip on' : 'chip'}
            onClick={() => setActiveCategory('overview')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeCategory === 'twin' ? 'chip on' : 'chip'}
            onClick={() => setActiveCategory('twin')}
          >
            Bản sao 3D
          </button>
          <button
            type="button"
            className={activeCategory === 'vision' ? 'chip on' : 'chip'}
            onClick={() => setActiveCategory('vision')}
          >
            Thị giác AI & CDC STEADI
          </button>
          <button
            type="button"
            className={activeCategory === 'copilot' ? 'chip on' : 'chip'}
            onClick={() => setActiveCategory('copilot')}
          >
            Trợ lý AI & RAG
          </button>
          <button
            type="button"
            className={activeCategory === 'xai' ? 'chip on' : 'chip'}
            onClick={() => setActiveCategory('xai')}
          >
            Giải trình AI (XAI)
          </button>
        </div>
      )}

      <div className="gallery">
        {items.map((item) => (
          <div
            key={item.id}
            className="shot"
            onClick={() => setActiveModal(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveModal(item)}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                onError={(e) => {
                  if (item.fallbackImage && !e.currentTarget.dataset.retried) {
                    e.currentTarget.dataset.retried = '1'
                    e.currentTarget.src = item.fallbackImage
                  }
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'rgba(6, 11, 20, 0.85)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.72rem',
                  color: 'var(--cyan)'
                }}
              >
                <ZoomIn size={13} /> Phóng to
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  background: 'rgba(6, 11, 20, 0.85)',
                  border: '1px solid var(--line)',
                  borderRadius: 99,
                  padding: '2px 10px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--green)'
                }}
              >
                {item.categoryLabel}
              </div>
            </div>
            <span>
              <strong>{item.title}</strong>
              <small>{item.summary}</small>
            </span>
          </div>
        ))}
      </div>

      {/* Lightbox Zoom Modal */}
      {activeModal && (
        <div className="lightbox-overlay" onClick={() => setActiveModal(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              <img
                src={activeModal.image}
                alt={activeModal.title}
                onError={(e) => {
                  if (activeModal.fallbackImage && !e.currentTarget.dataset.retried) {
                    e.currentTarget.dataset.retried = '1'
                    e.currentTarget.src = activeModal.fallbackImage
                  }
                }}
              />
              <button
                type="button"
                className="lightbox-close"
                style={{ position: 'absolute', top: 12, right: 12 }}
                onClick={() => setActiveModal(null)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
            <div className="lightbox-bar">
              <div>
                <h4>{activeModal.title}</h4>
                <p>{activeModal.summary}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {activeModal.features.map((f) => (
                    <span key={f} className="badge badge-verified" style={{ fontSize: '0.72rem' }}>
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="lightbox-close"
                onClick={() => setActiveModal(null)}
              >
                Đóng (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
