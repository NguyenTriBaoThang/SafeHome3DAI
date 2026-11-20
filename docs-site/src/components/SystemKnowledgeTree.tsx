import { useState } from 'react'
import {
  Camera,
  ClipboardCheck,
  Box,
  Search,
  CheckCircle2,
  Layers,
  Activity,
  GitFork,
  Sliders,
  Database,
  ShieldCheck,
  FileText,
  ChevronRight,
  Info,
  Code2,
  Sparkles,
} from 'lucide-react'
import { Src } from './ui'

export interface KnowledgeNode {
  id: string
  tier: number
  tierName: string
  tierColor: string
  title: string
  iconName: string
  subtitle: string
  tech: string
  sourcePath: string
  clinicalStandard: string
  testSuite: string
  description: string
  tags: string[]
}

export const KNOWLEDGE_NODES: KnowledgeNode[] = [
  // Tier 1: Sensory Perception
  {
    id: 'vision-studio',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Thị Giác AI (Vision Studio)',
    iconName: 'Camera',
    subtitle: 'Quét 18 lớp nội thất & Bounding Box HTML',
    tech: 'Gemini Multimodal Vision · Magic Bytes · EXIF GPS Stripper',
    sourcePath: 'src/lib/vision/visionProvider.ts',
    clinicalStandard: 'Bộ phân loại vật thể nguy cơ té ngã WHO 2021',
    testSuite: 'tests/visionEngine.test.ts (14 tests passed)',
    description: 'Bóc tách ảnh hiện trường thành danh mục vật thể số hóa. Kiểm tra Magic Bytes nhị phân (FF D8 FF / 89 50 4E 47), cắt bỏ 100% tọa độ GPS, chuẩn hóa bounding boxes và dùng nhãn CSS HTML Overlay loại trừ triệt để lỗi phóng to chữ Chromium.',
    tags: ['Multimodal AI', 'Privacy Guard', '18 Classes']
  },
  {
    id: 'item-hazard',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Thẩm Định Vật Dụng CDC STEADI',
    iconName: 'Search',
    subtitle: 'Chấm điểm rủi ro & ghim tọa độ H1..H4',
    tech: 'Hotspot Pin Locator · Click-to-Reposition · Biomechanics',
    sourcePath: 'src/lib/vision/itemHazardAnalyzer.ts',
    clinicalStandard: 'CDC STEADI Fall Prevention Guidelines (Checklist p.2)',
    testSuite: 'tests/itemHazardAssessment.test.ts (4 tests passed)',
    description: 'Thẩm định chuyên sâu đồ vật chụp gần: trả lời 3 câu hỏi lâm sàng (Mức độ nguy hiểm bao nhiêu? Tại sao nguy hiểm? Nguy hiểm ở chỗ nào?). Định vị ghim rủi ro H1..H4 trực tiếp trên ảnh và hỗ trợ kéo thả căn chỉnh tọa độ.',
    tags: ['CDC STEADI', 'Hotspots H1..H4', 'Biomechanics']
  },
  {
    id: 'survey-nlp',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Khảo Sát Thích Ứng & NLP',
    iconName: 'ClipboardCheck',
    subtitle: 'Tỉa nhánh câu hỏi & hiểu tiếng Việt đời thường',
    tech: 'Dynamic Irrelevance Pruning · Vietnamese NLP Parser · True Denominator',
    sourcePath: 'src/lib/survey/flowEngine.ts',
    clinicalStandard: 'CDC STEADI Screening Protocol & WHO Clinical Fall Risk',
    testSuite: 'tests/surveyEngine.test.ts (9 tests passed)',
    description: 'Hệ thống khảo sát thích ứng DAG. Tự động bỏ qua câu hỏi không liên quan khi câu hỏi cha = NO (ví dụ không có thảm thì không hỏi viền thảm). Hiểu từ đo lường dân dã tiếng Việt (phân, tấc, mét) và tín hiệu chưa chắc chắn (chưa rõ, không biết).',
    tags: ['DAG Pruning', 'Vietnamese NLP', 'Zero Skew']
  },
  {
    id: 'digital-twin-core',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Bản Sao Số 3D WebGL (Three.js)',
    iconName: 'Box',
    subtitle: 'Photorealistic Dollhouse, Studio 0-520 Lux',
    tech: 'Three.js · React Three Fiber · PBR Shaders · OrbitControls',
    sourcePath: 'src/data/dollhouseReferenceScene.ts',
    clinicalStandard: 'WHO Environmental Illumination Standards (Threshold <50 Lux)',
    testSuite: 'tests/dollhouseReferenceScene.test.ts (5 tests passed)',
    description: 'Không gian phòng ngủ và nhà vệ sinh khép kín tỷ lệ 1:1. Tích hợp 4 chế độ ánh sáng (Nắng sớm, Ban ngày, Đêm 40 Lux nguy hiểm, Studio 320 Lux) và chuyển đổi ma sát mặt sàn khô ráo vs trơn ướt.',
    tags: ['Three.js', 'Dollhouse', 'Lighting Studio']
  },

  // Tier 2: Spatial Normalization & Facts
  {
    id: 'spatial-validation',
    tier: 2,
    tierName: 'TẦNG 2: BÓC TÁCH & CHUẨN HÓA HÌNH HỌC',
    tierColor: '#38bdf8',
    title: 'Spatial Validation Engine',
    iconName: 'Layers',
    subtitle: 'Kiểm định AABB/OBB & Thông thủy lối đi <80cm',
    tech: 'World-Space MinY Floor Snapping · Geometric Collision Tolerances',
    sourcePath: 'src/lib/reconstruction/spatialValidationEngine.ts',
    clinicalStandard: 'ADA Accessibility Standards (Clear Walkway Width)',
    testSuite: 'tests/spatialValidationEngine.test.ts (8 tests passed)',
    description: 'Xác thực tọa độ hình học 3 chiều: ngăn chặn đồ vật bay lơ lửng, chìm sàn, xuyên tường; phát hiện lối đi bị thu hẹp dưới 80cm gây cản trở cho người già dùng khung tập đi hoặc gậy chống.',
    tags: ['AABB/OBB Bounds', 'Clearance <80cm', 'Snapping']
  },
  {
    id: 'marker-clustering',
    tier: 2,
    tierName: 'TẦNG 2: BÓC TÁCH & CHUẨN HÓA HÌNH HỌC',
    tierColor: '#38bdf8',
    title: 'Smart Marker Clustering',
    iconName: 'Sliders',
    subtitle: 'Gom cụm nhãn 3D bán kính Euclidean <0.95m',
    tech: 'Euclidean Spatial Clustering Algorithm (<2ms latency)',
    sourcePath: 'src/components/three/RoomCanvas.tsx',
    clinicalStandard: 'Công thái học giao diện trực quan cho người cao tuổi',
    testSuite: 'tests/workflowEngine.test.ts (4 tests passed)',
    description: 'Khi nhiều điểm nguy cơ nằm cạnh nhau trong không gian hẹp, thuật toán tự động gom các nhãn riêng lẻ thành 1 nhãn cụm duy nhất (ví dụ: [🔴 +3 Nguy cơ]), bấm vào để mở rộng, loại bỏ 100% hiện tượng đè lấn chữ.',
    tags: ['Radius <0.95m', 'Anti-clutter', 'Zero Overlap']
  },
  {
    id: 'stale-dependency',
    tier: 2,
    tierName: 'TẦNG 2: BÓC TÁCH & CHUẨN HÓA HÌNH HỌC',
    tierColor: '#38bdf8',
    title: 'Stale Dependency Purger',
    iconName: 'CheckCircle2',
    subtitle: 'Hủy dữ liệu con & dọn sạch nguy cơ lỗi thời',
    tech: 'DAG Invalidation Cascade · AuditEvent Synchronizer',
    sourcePath: 'src/lib/survey/flowEngine.ts',
    clinicalStandard: 'Quy trình kiểm toán y tế nhất quán (Data Integrity)',
    testSuite: 'tests/surveyIntegration.test.ts (4 tests passed)',
    description: 'Khi người dùng quay lại sửa câu trả lời cha (ví dụ đổi từ Có thảm sang Không thảm), hệ thống tự động tìm và xóa câu trả lời con cũ trong database, hủy bỏ mối nguy RISK-001 phát sinh trước đó.',
    tags: ['Data Integrity', 'Auto Purge', 'Cascade']
  },

  // Tier 3: Evidence-Based Clinical Rules
  {
    id: 'risk-registry',
    tier: 3,
    tierName: 'TẦNG 3: TRI THỨC Y HỌC CHỨNG CỨ',
    tierColor: '#fbbf24',
    title: 'Bảng Đăng Ký 8 Quy Tắc Lâm Sàng',
    iconName: 'ShieldCheck',
    subtitle: 'Chuẩn hóa 100% theo WHO 2021 & CDC STEADI',
    tech: 'Versioned Pure Functions (RISK-001..008) · Zod Contracts',
    sourcePath: 'src/lib/risk/riskRuleRegistry.ts',
    clinicalStandard: 'WHO Global Report on Fall Prevention & CDC STEADI',
    testSuite: 'tests/riskIntelligence.test.ts (10 tests passed)',
    description: '8 quy tắc y khoa lâm sàng phiên bản 1.0.0: Thảm trượt (RISK-001), Dây điện lối đi (RISK-002), Vật cản thông thủy (RISK-003), Thiếu sáng ban đêm <50 Lux (RISK-004), Sàn phòng tắm trơn (RISK-005), Thiếu thanh vịn bồn cầu/vòi sen (RISK-006), Gờ bậc cửa >1.5cm (RISK-007), Công tắc ngoài tầm với (RISK-008).',
    tags: ['WHO 2021', 'CDC STEADI', 'ADA Barrier-free']
  },
  {
    id: 'rag-knowledge',
    tier: 3,
    tierName: 'TẦNG 3: TRI THỨC Y HỌC CHỨNG CỨ',
    tierColor: '#fbbf24',
    title: 'Chỉ Mục Vector Y Khoa RAG',
    iconName: 'FileText',
    subtitle: 'WHO 2021, NCOA, Bộ Y Tế Việt Nam',
    tech: 'Vector Similarity · Grounded Retrieval · Citation Grounding',
    sourcePath: 'src/lib/rag/retrieval.ts',
    clinicalStandard: 'Cẩm nang phòng ngừa tai nạn thương tích Bộ Y Tế & NCOA',
    testSuite: 'tests/ragEngine.test.ts (4 tests passed)',
    description: 'Kho tri thức chuyên sâu gồm 114 đoạn trích y khoa chuẩn mực được lập chỉ mục vector, phục vụ truy vấn thời gian thực cho trợ lý AI Copilot kèm số trang và liên kết cổng thông tin chính thống.',
    tags: ['Vector Chunks', 'Ministry of Health', 'NCOA']
  },

  // Tier 4: Deterministic Reasoning & XAI
  {
    id: 'risk-engine',
    tier: 4,
    tierName: 'TẦNG 4: SUY LUẬN TẤT ĐỊNH & XAI',
    tierColor: '#f87171',
    title: 'Deterministic Risk Engine',
    iconName: 'Activity',
    subtitle: 'S = max(0, 100 - ∑Penalties) · 0% Ảo giác',
    tech: 'Deterministic Penalty Formulation · Risk Classification',
    sourcePath: 'src/lib/risk/ruleEngine.ts',
    clinicalStandard: 'Y học chứng cứ tất định (Zero Hallucination Guarantee)',
    testSuite: 'tests/riskEngine.test.ts (11 tests passed)',
    description: 'Công thức toán học tất định tính toán điểm an toàn (0 - 100) và phân tầng rủi ro lâm sàng: An toàn cao (80-100), Trung bình (60-79), Nguy cơ cao (0-59). Không dựa vào xác suất sinh từ của LLM.',
    tags: ['Pure Math', 'Zero Hallucination', 'Score 0-100']
  },
  {
    id: 'rag-copilot',
    tier: 4,
    tierName: 'TẦNG 4: SUY LUẬN TẤT ĐỊNH & XAI',
    tierColor: '#f87171',
    title: 'Trợ Lý AI SafeHome Copilot',
    iconName: 'Sparkles',
    subtitle: 'Đối chiếu không gian 3D & Ngăn tra cứu 4 Tab',
    tech: 'SafeHomeMarkdown · Evidence Drawer · Grounded Generator',
    sourcePath: 'src/lib/rag/groundedGenerator.ts',
    clinicalStandard: 'Nguyên tắc an toàn y tế và tuyên bố trách nhiệm',
    testSuite: 'tests/copilotEngine.test.ts (10 tests passed)',
    description: 'Hội thoại y học thông minh: tự động liên kết trạng thái phòng 3D đang khảo sát, gắn thẻ trích dẫn [1]..[4] và cung cấp ngăn tra cứu 4 tab (Bằng chứng, Vật dụng, Kho nguồn, Thẩm định RAG 8 tiêu chí).',
    tags: ['Grounded RAG', '4-Tab Drawer', '3D Context']
  },
  {
    id: 'xai-tree',
    tier: 4,
    tierName: 'TẦNG 4: SUY LUẬN TẤT ĐỊNH & XAI',
    tierColor: '#f87171',
    title: 'Cây Phả Hệ Quyết Định (XAI Graph)',
    iconName: 'GitFork',
    subtitle: 'Minh bạch chuỗi nhân quả 100% không hộp đen',
    tech: 'ReactFlow Interactive DAG · Traceability Inspector',
    sourcePath: 'src/app/explainability/page.tsx',
    clinicalStandard: 'Tiêu chuẩn minh bạch AI trong chăm sóc sức khỏe (WHO XAI)',
    testSuite: 'tests/copilotIntegration.test.ts (4 tests passed)',
    description: 'Trực quan hóa đường suy luận: Không gian phòng → Vật thể 3D → Số đo hình học → Quy chuẩn y tế → Nguy cơ cảnh báo → Đề xuất can thiệp. Bấm vào bất kỳ node nào để xem căn cứ pháp lý và y văn.',
    tags: ['ReactFlow', 'Explainable AI', 'No Black Box']
  },

  // Tier 5: Actionable Interventions & Persistence
  {
    id: 'scenario-simulator',
    tier: 5,
    tierName: 'TẦNG 5: CAN THIỆP & LƯU TRỮ',
    tierColor: '#34d399',
    title: 'Mô Phỏng Can Thiệp (What-If)',
    iconName: 'Sliders',
    subtitle: 'Thử nghiệm phương án cải tạo & Undo/Redo',
    tech: 'Intervention Engine · 3D Scene State Sync · Delta KPI',
    sourcePath: 'src/lib/risk/comparisonEngine.ts',
    clinicalStandard: 'Phác đồ can thiệp môi trường vật lý (Environmental Modifications)',
    testSuite: 'tests/simulationUndoRedo.test.ts (3 tests passed)',
    description: 'Cho phép người dùng thử nghiệm can thiệp ảo (thêm thanh vịn, dán băng dính thảm, kẹp dây điện, tăng độ sáng 320 Lux) để xem ngay điểm an toàn hồi phục (từ 28 lên 100) trước khi tốn tiền mua sắm thật.',
    tags: ['What-If', 'Undo/Redo', '+72 Points Recovery']
  },
  {
    id: 'prisma-store',
    tier: 5,
    tierName: 'TẦNG 5: CAN THIỆP & LƯU TRỮ',
    tierColor: '#34d399',
    title: 'Prisma Relational Store & Audit',
    iconName: 'Database',
    subtitle: '16 Bảng dữ liệu quan hệ & AuditEvent Store',
    tech: 'Prisma ORM · SQLite (Dev) · PostgreSQL (Prod) · PDF Exporter',
    sourcePath: 'src/lib/database/prisma.ts',
    clinicalStandard: 'Chuẩn bảo mật dữ liệu sức khỏe và nhật ký kiểm toán',
    testSuite: 'tests/workflowIntegration.test.ts (1 test passed)',
    description: 'Hệ thống quản lý 16 models quan hệ đồng bộ (Room, Object3D, SurveySession, RiskAssessment, AuditEvent,...). Lưu trữ toàn bộ lịch sử biến đổi trạng thái y tế và xuất báo cáo PDF chuẩn in ấn.',
    tags: ['16 Models', 'Prisma ORM', 'Audit Trail']
  }
]

export function SystemKnowledgeTree() {
  const [selectedId, setSelectedId] = useState<string>('vision-studio')
  const [activeTierFilter, setActiveTierFilter] = useState<number | 'all'>('all')

  const selectedNode = KNOWLEDGE_NODES.find((n) => n.id === selectedId) || KNOWLEDGE_NODES[0]

  const tiers = [
    { num: 1, label: 'Tầng 1: Cảm Biến & Thu Nhận', count: 4, color: '#22d3ee' },
    { num: 2, label: 'Tầng 2: Bóc Tách & Chuẩn Hóa', count: 3, color: '#38bdf8' },
    { num: 3, label: 'Tầng 3: Tri Thức Y Học Chứng Cứ', count: 2, color: '#fbbf24' },
    { num: 4, label: 'Tầng 4: Suy Luận Tất Định & XAI', count: 3, color: '#f87171' },
    { num: 5, label: 'Tầng 5: Can Thiệp & Lưu Trữ', count: 2, color: '#34d399' },
  ]

  const filteredNodes = KNOWLEDGE_NODES.filter(
    (n) => activeTierFilter === 'all' || n.tier === activeTierFilter
  )

  return (
    <div className="knowledge-tree-container">
      {/* Top Filter Chips */}
      <div className="chips" role="group" aria-label="Bộ lọc tầng tri thức" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={activeTierFilter === 'all' ? 'chip on' : 'chip'}
          onClick={() => setActiveTierFilter('all')}
        >
          Toàn Bộ Cây Tri Thức (5 Tầng · 14 Mắt Xích)
        </button>
        {tiers.map((t) => (
          <button
            key={t.num}
            type="button"
            className={activeTierFilter === t.num ? 'chip on' : 'chip'}
            onClick={() => setActiveTierFilter(t.num)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Main Visual Knowledge Tree Area */}
      <div className="tree-workspace">
        {/* Left Tree Graph View */}
        <div className="tree-graph-view">
          <div className="tree-canvas">
            {tiers
              .filter((t) => activeTierFilter === 'all' || t.num === activeTierFilter)
              .map((tier) => {
                const tierNodes = filteredNodes.filter((n) => n.tier === tier.num)
                return (
                  <div key={tier.num} className="tree-tier-column">
                    <div className="tier-header" style={{ borderLeftColor: tier.color }}>
                      <span className="tier-tag mono" style={{ color: tier.color }}>
                        TIER 0{tier.num}
                      </span>
                      <strong className="tier-title">{tier.label.split(':')[1]}</strong>
                    </div>

                    <div className="tier-nodes-list">
                      {tierNodes.map((node) => {
                        const isSelected = node.id === selectedId
                        return (
                          <div
                            key={node.id}
                            className={`tree-node-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedId(node.id)}
                            style={{
                              borderColor: isSelected ? node.tierColor : 'var(--line)',
                              boxShadow: isSelected ? `0 0 16px ${node.tierColor}33` : 'none',
                            }}
                          >
                            <div className="node-head">
                              <span className="node-dot" style={{ background: node.tierColor }}></span>
                              <strong className="node-title">{node.title}</strong>
                            </div>
                            <p className="node-sub">{node.subtitle}</p>
                            <div className="node-tags">
                              {node.tags.map((tag) => (
                                <span key={tag} className="node-tag mono">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="node-connector-arrow">
                              <ChevronRight size={14} color={isSelected ? node.tierColor : 'var(--muted)'} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Right Node Inspector Panel */}
        <div className="tree-inspector">
          <div className="inspector-card">
            <div className="inspector-head">
              <span className="badge badge-verified" style={{ background: `${selectedNode.tierColor}1a`, color: selectedNode.tierColor, borderColor: selectedNode.tierColor }}>
                {selectedNode.tierName}
              </span>
              <span className="status-badge-green">
                <CheckCircle2 size={13} /> Verified in CI
              </span>
            </div>

            <h3 className="inspector-title" style={{ color: '#fff', margin: '10px 0 4px', fontSize: '1.2rem' }}>
              {selectedNode.title}
            </h3>
            <p className="inspector-sub" style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: '0 0 16px' }}>
              {selectedNode.subtitle}
            </p>

            <div className="inspector-detail-rows">
              <div className="inspect-row">
                <dt><Code2 size={14} /> Công nghệ lõi / Thuật toán</dt>
                <dd className="mono">{selectedNode.tech}</dd>
              </div>

              <div className="inspect-row">
                <dt><FileText size={14} /> File mã nguồn dự án</dt>
                <dd><Src path={selectedNode.sourcePath} /></dd>
              </div>

              <div className="inspect-row">
                <dt><ShieldCheck size={14} /> Tiêu chuẩn y khoa liên quan</dt>
                <dd style={{ color: 'var(--amber)' }}>{selectedNode.clinicalStandard}</dd>
              </div>

              <div className="inspect-row">
                <dt><CheckCircle2 size={14} /> Ca kiểm thử tự động (Vitest)</dt>
                <dd className="mono" style={{ color: 'var(--green)' }}>{selectedNode.testSuite}</dd>
              </div>
            </div>

            <div className="inspector-desc-box">
              <div className="desc-title"><Info size={14} /> Cơ Chế Hoạt Động Cốt Lõi:</div>
              <p className="desc-text">{selectedNode.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

