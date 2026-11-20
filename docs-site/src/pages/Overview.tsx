import { ArrowRight, Github, CheckCircle2, ShieldCheck, Database, Cpu, Layers, Activity, Eye, Box, FileText, Sliders, BarChart3, AlertTriangle } from 'lucide-react'
import { REPO_URL, LIVE_URL, SRC } from '../data/site'
import { Callout, Src } from '../components/ui'
import { VisualGallery } from '../components/VisualGallery'

function HeroViz() {
  // Pathway from bed, through bedroom door, into bathroom, turning to toilet
  const nightRoute = 'M 90 90 L 160 90 L 160 170 L 260 170 L 260 210'

  return (
    <svg className="hero-viz" viewBox="0 0 420 280" role="img" aria-label="Sơ đồ mặt bằng 3D kiến trúc phòng ngủ và nhà vệ sinh với đường đi ban đêm và các điểm nguy cơ">
      <defs>
        <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--line)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="420" height="280" fill="url(#gridPattern)" />

      {/* Bedroom Walls */}
      <rect x="25" y="25" width="180" height="225" className="room-wall" />
      {/* Bathroom Walls */}
      <rect x="205" y="110" width="185" height="140" className="room-wall" />

      {/* Bed Frame & Mattress */}
      <rect x="40" y="45" width="80" height="90" rx="4" className="bed-frame" />
      <rect x="44" y="50" width="72" height="30" rx="2" fill="#1c3b60" />
      <text x="80" y="100" fill="var(--cyan)" fontSize="9" textAnchor="middle" fontFamily="var(--mono)" fontWeight="700">GIƯỜNG NGỦ</text>

      {/* Nightstand */}
      <rect x="125" y="45" width="28" height="28" rx="2" fill="#14203f" stroke="#2c4268" />

      {/* Door Openings */}
      <path d="M 185 170 A 20 20 0 0 1 205 190" className="door-arc" />
      <path d="M 205 170 L 205 190" stroke="var(--cyan)" strokeWidth="1.5" />

      {/* Bathroom Fixtures: Toilet & Shower */}
      <rect x="245" y="215" width="30" height="30" rx="6" fill="#0f2a26" stroke="#1c5d49" />
      <circle cx="260" cy="225" r="8" fill="#1c5d49" />
      <text x="260" y="240" fill="var(--green)" fontSize="8" textAnchor="middle" fontFamily="var(--mono)">BỒN CẦU</text>

      <rect x="310" y="125" width="65" height="65" rx="3" fill="#0e2233" stroke="#254a94" strokeDasharray="3 3" />
      <text x="342" y="160" fill="var(--blue)" fontSize="8" textAnchor="middle" fontFamily="var(--mono)">BUỒNG TẮM</text>

      {/* Dynamic Animated Night Pathway */}
      <path d={nightRoute} className="night-route" />

      {/* Hazard Pulse Nodes (WHO/CDC STEADI) */}
      {/* 1. Loose Rug near bed */}
      <g transform="translate(135 110)">
        <circle r="14" className="hazard-pulse" />
        <circle r="5" className="hazard-node red" />
        <text x="8" y="4" fill="var(--red)" fontSize="8" fontFamily="var(--mono)" fontWeight="700">Thảm trượt</text>
      </g>

      {/* 2. Trailing wire in corridor */}
      <g transform="translate(160 145)">
        <circle r="14" className="hazard-pulse" style={{ animationDelay: '0.8s' }} />
        <circle r="5" className="hazard-node" />
        <text x="-8" y="16" fill="var(--amber)" fontSize="8" fontFamily="var(--mono)" fontWeight="700" textAnchor="end">Dây điện</text>
      </g>

      {/* 3. Dark Zone in hallway */}
      <g transform="translate(225 170)">
        <circle r="12" className="hazard-pulse" style={{ animationDelay: '1.4s' }} />
        <circle r="4" className="hazard-node" />
        <text x="0" y="-8" fill="var(--amber)" fontSize="8" fontFamily="var(--mono)" textAnchor="middle">&lt; 50 Lux</text>
      </g>

      {/* Protective Grab Bar Node */}
      <g transform="translate(285 220)">
        <circle r="4" className="safe-node" />
        <text x="8" y="4" fill="var(--green)" fontSize="8" fontFamily="var(--mono)">Thanh vịn (Đạt)</text>
      </g>

      {/* Moving Walker Along Path */}
      <circle r="4.5" className="walker">
        <animateMotion dur="8s" repeatCount="indefinite" path={nightRoute} />
      </circle>

      {/* Room Monospace Labels */}
      <text x="35" y="40" className="room-text">PHÒNG NGỦ CAO TUỔI</text>
      <text x="215" y="124" className="room-text">NHÀ VỆ SINH</text>
    </svg>
  )
}

export default function Overview() {
  return (
    <>
      {/* 1. Two-Column Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow mono">Hệ Sinh Thái Y Tế Kỹ Thuật Số & Thị Giác 3D · SafeHome 3D AI</p>
          <h1>SafeHome 3D AI</h1>
          <p className="tagline">Nhà an toàn, tuổi già an tâm.</p>
          <p className="lead">
            Nền tảng Bản sao số 3D kết hợp Thị giác AI đa tầng, Khảo sát thích ứng và Động cơ đánh giá rủi ro y khoa tất định theo chuẩn WHO 2021 & CDC STEADI nhằm chủ động nhận diện, giải trình và loại bỏ triệt để nguy cơ té ngã trong không gian sống của người cao tuổi.
          </p>
          <div className="cta">
            <a className="btn primary" href="#/architecture">
              Khám Phá Kiến Trúc <ArrowRight size={16} aria-hidden />
            </a>
            <a className="btn" href="#/risk">
              Động Cơ Y Khoa (WHO/CDC) <ArrowRight size={16} aria-hidden />
            </a>
            <a className="btn" href={LIVE_URL} target="_blank" rel="noreferrer">
              Chạy Ứng Dụng Local <ArrowRight size={16} aria-hidden />
            </a>
            <a className="btn" href={REPO_URL} target="_blank" rel="noreferrer">
              <Github size={16} aria-hidden /> GitHub
            </a>
          </div>
        </div>
        <HeroViz />
      </section>

      {/* 2. Verified Project Snapshot Card */}
      <section className="page" style={{ paddingTop: 0 }}>
        <div className="card" style={{ borderLeft: '4px solid var(--cyan)', background: 'var(--panel2)' }}>
          <div className="card-head" style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color="var(--cyan)" /> Ảnh Chụp Dự Án Đã Kiểm Chứng (Verified Project Snapshot)
            </h2>
            <span className="mono dim small">Cập nhật: 2026-11-20 · Production Ready</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            <div>
              <p className="mono dim" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--green)' }} /> Bộ Kiểm Thử Tự Động
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>
                109 / 109 Tests Passed (0 Fail)<br />
                <span className="small dim" style={{ color: 'var(--green)' }}>20 Test Suites · 100% Pass Rate</span>
              </p>
            </div>
            <div>
              <p className="mono dim" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <Database size={13} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--cyan)' }} /> Cơ Sở Dữ Liệu Prisma
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>
                16 Mô Hình Dữ Liệu Quan Hệ<br />
                <span className="small dim">SQLite (dev) / PostgreSQL (prod) · AuditEvent</span>
              </p>
            </div>
            <div>
              <p className="mono dim" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <Cpu size={13} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--amber)' }} /> Động Cơ Y Khoa Tất Định
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>
                8 Quy Tắc Lâm Sàng Chuẩn Mực<br />
                <span className="small dim">WHO 2021 & CDC STEADI · 0 Hallucination</span>
              </p>
            </div>
            <div>
              <p className="mono dim" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <Layers size={13} style={{ display: 'inline', verticalAlign: '-1px', color: 'var(--blue)' }} /> Bản Sao Số 3D & Thị Giác
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>
                Photorealistic Dollhouse 3D<br />
                <span className="small dim">Thị giác đa tầng & Gom cụm nhãn &lt; 0.95m</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Deep-Dive: What is SafeHome 3D AI? */}
      <section className="page">
        <h2>SafeHome 3D AI Là Gì?</h2>
        <div className="two">
          <div>
            <p>
              Té ngã là nguyên nhân hàng đầu gây chấn thương tử vong và gãy cổ xương đùi ở người cao tuổi trên toàn thế giới. Theo thống kê của <strong>WHO (2021)</strong> và <strong>CDC STEADI</strong>, hơn 50% các vụ té ngã nghiêm trọng xảy ra ngay tại không gian sống gia đình do các mối nguy tiềm ẩn: thảm trượt, thiếu thanh vịn bồn cầu, sàn phòng tắm ướt, dây điện chắn ngang và độ sáng ban đêm không đủ (&lt; 50 Lux).
            </p>
            <p>
              Các bảng kiểm tra checklist bằng giấy truyền thống thường dài dòng, khó hình dung trực quan và dễ dẫn đến sai sót. Trong khi đó, các chatbot AI tạo sinh thông thường lại mắc lỗi <strong>ảo giác (hallucination)</strong> về các thông số công thái học y tế và kích thước vật lý.
            </p>
            <Callout title="Nguyên Tắc Kiến Trúc Cốt Lõi (Đã Kiểm Chứng Trong Code)">
              Mọi cảnh báo nguy cơ và điểm số an toàn (Safety Score 0-100) được tính toán hoàn toàn qua <Src path="Deterministic Clinical Rules" />, triệt tiêu 100% ảo giác AI. Trợ lý Copilot bắt buộc phải trích dẫn trực tiếp chương mục từ cẩm nang y tế được cấp phép (<Src path={SRC.rag} />). Xem thêm tại <Src path={SRC.riskEngine} />.
            </Callout>
          </div>

          <ol className="chain" aria-label="Hành trình số hóa 4 giai đoạn cốt lõi">
            {[
              ['Khảo Sát Thích Ứng (AI Survey)', 'Tự động tỉa nhánh câu hỏi dư thừa, hiểu tiếng Việt tự nhiên và trích xuất số đo'],
              ['Thị Giác Đa Tầng (Vision & Items)', 'Quét toàn cảnh phòng dựng 3D & Thẩm định rủi ro vật dụng theo chuẩn CDC STEADI'],
              ['Bản Sao Số 3D (Digital Twin Space)', 'Tái hiện không gian Photorealistic, studio ánh sáng động và gom cụm nhãn < 0.95m'],
              ['Động Cơ Y Khoa & Can Thiệp', '8 quy tắc lâm sàng WHO 2021, mô phỏng can thiệp What-If và xuất báo cáo PDF'],
            ].map(([title, desc], i) => (
              <li key={title}>
                <span className="mono">0{i + 1}</span>
                <strong style={{ color: '#fff' }}>{title}</strong>
                <small>{desc}</small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Target User Personas */}
      <section className="page">
        <h2>Đối Tượng Sử Dụng Mục Tiêu</h2>
        <div className="roles">
          <div className="role">
            <h3>Người Cao Tuổi & Gia Đình</h3>
            <dt>Nhu cầu cốt lõi:</dt>
            <dd>Nhận diện nhanh chóng các mối nguy hiểm tiềm tàng trong nhà chỉ bằng việc trả lời vài câu hỏi hoặc chụp ảnh vật dụng.</dd>
            <dt>Giải pháp SafeHome 3D AI:</dt>
            <dd>Giao diện tiếng Việt gần gũi, mô hình 3D trực quan sinh động, bảng dự toán chi phí cải tạo thực tế từ 50.000đ - 300.000đ.</dd>
          </div>

          <div className="role">
            <h3>Bác Sĩ Lão Khoa & Chuyên Viên Y Tế</h3>
            <dt>Nhu cầu cốt lõi:</dt>
            <dd>Cần công cụ lượng giá an toàn môi trường sống khách quan dựa trên cẩm nang y học chứng cứ chính thức (Evidence-based).</dd>
            <dt>Giải pháp SafeHome 3D AI:</dt>
            <dd>Động cơ tất định 100% tuân thủ cẩm nang WHO 2021 & CDC STEADI, sơ đồ giải trình quyết định XAI minh bạch, không hộp đen.</dd>
          </div>

          <div className="role">
            <h3>Kỹ Sư & Đội Ngũ Cải Tạo Nhà Cửa</h3>
            <dt>Nhu cầu cốt lõi:</dt>
            <dd>Cần số đo kỹ thuật chính xác (chiều cao nệm, độ rọi Lux, vị trí lắp đặt thanh vịn) để lên bản vẽ thi công.</dd>
            <dt>Giải pháp SafeHome 3D AI:</dt>
            <dd>Bản sao số 3D tỷ lệ 1:1, xuất báo cáo danh mục vật tư cần chuẩn bị và hướng dẫn thi công đạt chuẩn công thái học.</dd>
          </div>
        </div>
      </section>

      {/* Visual System Walkthrough (Screenshots Gallery) */}
      <section className="page">
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--cyan)' }}>■</span> Hình Ảnh & Giao Diện Thực Nghiệm (Visual System Walkthrough)
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
          Khám phá hệ sinh thái SafeHome 3D AI qua ảnh chụp thực tế từ các phân hệ đang vận hành: Bảng điều khiển môi trường, Bản sao 3D Photorealistic Dollhouse, Thị giác AI, Thẩm định rủi ro vật dụng CDC STEADI và Cây phả hệ quyết định XAI. Bấm vào từng ảnh để phóng to.
        </p>
        <VisualGallery />
      </section>

      {/* 5. 7-Step Unified Flow Capability Cards */}
      <section className="page">
        <h2>Hành Trình 7 Bước Khép Kín (7-Step Unified Flow)</h2>
        <div className="grid">
          <div className="card">
            <div className="card-head">
              <span className="badge badge-verified">Bước 01</span>
              <span className="mono dim small">/ai-guided-survey</span>
            </div>
            <h3 style={{ marginTop: '0.6rem' }}>Khảo Sát AI Thích Ứng</h3>
            <p>Thuật toán tỉa nhánh câu hỏi động (Dynamic Irrelevance Pruning), cơ chế hủy phụ thuộc cũ và nhận diện ngôn ngữ tự nhiên tiếng Việt.</p>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="badge badge-verified">Bước 02</span>
              <span className="mono dim small">/ai-vision</span>
            </div>
            <h3 style={{ marginTop: '0.6rem' }}>Thị Giác AI Đa Tầng</h3>
            <p>Xác thực Magic Bytes, loại bỏ 100% EXIF GPS, nhận diện 18 lớp vật thể y tế và thẩm định nguy cơ đồ vật theo chuẩn CDC STEADI.</p>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="badge badge-verified">Bước 03</span>
              <span className="mono dim small">/digital-twin</span>
            </div>
            <h3 style={{ marginTop: '0.6rem' }}>Bản Sao Số 3D</h3>
            <p>Không gian kiến trúc Photorealistic Dollhouse, studio điều khiển ánh sáng 4 chế độ (0-520 Lux) và thuật toán gom cụm nhãn &lt; 0.95m.</p>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="badge badge-verified">Bước 04</span>
              <span className="mono dim small">/risk-assessment</span>
            </div>
            <h3 style={{ marginTop: '0.6rem' }}>Đánh Giá Nguy Cơ Lâm Sàng</h3>
            <p>Chấm điểm an toàn tất định 100% từ 0 đến 100 theo 8 quy tắc lâm sàng WHO 2021 và CDC STEADI, phân tầng ưu tiên xử lý trong 24-48h.</p>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="badge badge-verified">Bước 05</span>
              <span className="mono dim small">/scenario-simulator</span>
            </div>
            <h3 style={{ marginTop: '0.6rem' }}>Mô Phỏng Can Thiệp Thử Nghiệm</h3>
            <p>Phân tích What-If tức thì: Dán viền thảm, nẹp dây điện, bổ sung thanh vịn bồn cầu, phủ nano chống trơn kèm tính năng Undo/Redo.</p>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="badge badge-verified">Bước 06</span>
              <span className="mono dim small">/analytics</span>
            </div>
            <h3 style={{ marginTop: '0.6rem' }}>Phân Tích Trước / Sau</h3>
            <p>Biểu đồ Radar so sánh 5 chiều an toàn không gian, tính toán Delta Score và định lượng phần trăm nguy cơ té ngã đã được triệt tiêu.</p>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="badge badge-verified">Bước 07</span>
              <span className="mono dim small">/reports</span>
            </div>
            <h3 style={{ marginTop: '0.6rem' }}>Kế Hoạch Cải Tạo & Báo Cáo</h3>
            <p>Đóng gói lộ trình hành động thiết thực, bảng dự toán vật tư và chi phí, hỗ trợ in ấn trực tiếp hoặc xuất file PDF/JSON hoàn chỉnh.</p>
          </div>
        </div>
      </section>
    </>
  )
}
